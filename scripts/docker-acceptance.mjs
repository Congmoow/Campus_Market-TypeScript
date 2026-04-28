import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { createAcceptanceReporter } from './acceptance-report.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const frontendBaseUrl = process.env.DOCKER_ACCEPTANCE_FRONTEND_URL || 'http://localhost';
const backendBaseUrl = process.env.DOCKER_ACCEPTANCE_BACKEND_URL || 'http://localhost:3000';

const reporter = createAcceptanceReporter({
  repoRoot,
  frontendBaseUrl,
  backendBaseUrl,
  envSnapshot: {
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV ?? null,
    ci: process.env.CI ?? null,
    platform: process.platform,
  },
});

function logStep(message) {
  process.stdout.write(`\n[acceptance] ${message}\n`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function normalizeCheckPayload(payload) {
  if (
    payload &&
    typeof payload === 'object' &&
    !Array.isArray(payload) &&
    ('value' in payload ||
      'detail' in payload ||
      'businessId' in payload ||
      'businessIds' in payload)
  ) {
    return payload;
  }

  return {
    value: payload,
  };
}

async function runCheck(name, action) {
  try {
    return await reporter.runCheck(name, async () => {
      const payload = normalizeCheckPayload(await action());
      process.stdout.write(`  - ${name}: ${payload.detail ?? 'OK'}\n`);
      return payload;
    });
  } catch (error) {
    process.stdout.write(
      `  - ${name}: FAILED ${error instanceof Error ? error.message : String(error)}\n`,
    );
    throw error;
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let json = null;

  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }

  return { response, text, json };
}

function authHeaders(token, extraHeaders = {}) {
  return {
    Authorization: `Bearer ${token}`,
    ...extraHeaders,
  };
}

function uniqueIdentity(prefix) {
  const stamp = `${Date.now()}${Math.floor(Math.random() * 1000)}`.slice(-7);
  const phoneSecondDigit = `${Math.floor(3 + Math.random() * 7)}`;
  const phoneTail = `${Math.floor(100000000 + Math.random() * 900000000)}`;

  return {
    studentId: `${prefix}${stamp}`,
    phone: `1${phoneSecondDigit}${phoneTail}`,
  };
}

async function registerUser(prefix, name) {
  const identity = uniqueIdentity(prefix);
  const body = {
    studentId: identity.studentId,
    password: 'Passw0rd!',
    phone: identity.phone,
    name,
  };

  const { response, text, json } = await requestJson(`${frontendBaseUrl}/api/auth/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  assert(response.ok, `register failed for ${name}: ${response.status} ${text}`);
  assert(json?.success === true, `register payload invalid for ${name}`);
  assert(json?.data?.token, `register token missing for ${name}`);

  return {
    ...body,
    token: json.data.token,
    user: json.data.user,
  };
}

async function loginUser(studentId, password) {
  const { response, json } = await requestJson(`${frontendBaseUrl}/api/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ studentId, password }),
  });

  assert(response.ok, `login failed: ${response.status}`);
  assert(json?.success === true, 'login payload invalid');

  return {
    token: json.data.token,
    user: json.data.user,
    setCookie: response.headers.get('set-cookie') || '',
  };
}

async function uploadProductImage(token) {
  const filePath = path.join(repoRoot, 'frontend', 'public', 'images', 'market-favicon.png');
  const fileBuffer = await readFile(filePath);
  const form = new FormData();
  form.append('image', new File([fileBuffer], 'market-favicon.png', { type: 'image/png' }));

  const { response, json } = await requestJson(`${frontendBaseUrl}/api/upload/product`, {
    method: 'POST',
    headers: authHeaders(token),
    body: form,
  });

  assert(response.ok, `image upload failed: ${response.status}`);
  assert(json?.success === true, 'image upload payload invalid');
  assert(json?.data?.url?.startsWith('/uploads/products/'), 'image upload URL invalid');

  return json.data;
}

async function waitForServices() {
  const deadline = Date.now() + 420000;
  let lastError = 'services not ready';

  while (Date.now() < deadline) {
    try {
      const backendHealth = await fetch(`${backendBaseUrl}/health`, {
        signal: AbortSignal.timeout(5000),
      });
      const frontendHome = await fetch(`${frontendBaseUrl}`, {
        signal: AbortSignal.timeout(5000),
      });
      if (backendHealth.ok && frontendHome.ok) {
        return;
      }

      lastError = `health=${backendHealth.status}, frontend=${frontendHome.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }

    await new Promise((resolve) => setTimeout(resolve, 3000));
  }

  throw new Error(`services failed to become ready after restart: ${lastError}`);
}

function runDockerCompose(args) {
  const composeArgs = ['compose', '--env-file', '.env.docker.example', ...args];
  const result = spawnSync('docker', composeArgs, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error(
      `docker ${composeArgs.join(' ')} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  return result.stdout.trim();
}

function queryPostgresSingleValue(sql) {
  const composeArgs = [
    'compose',
    '--env-file',
    '.env.docker.example',
    'exec',
    '-T',
    'postgres',
    'psql',
    '-U',
    'campus_market',
    '-d',
    'campus_market',
    '-tAc',
    sql,
  ];
  const result = spawnSync('docker', composeArgs, {
    cwd: repoRoot,
    encoding: 'utf-8',
    stdio: 'pipe',
  });

  if (result.status !== 0) {
    throw new Error(
      `docker ${composeArgs.join(' ')} failed\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`,
    );
  }

  return result.stdout.trim();
}

async function writeFinalReport(error = null) {
  const report = await reporter.finalize({ error });
  process.stdout.write(`\n[acceptance] total checks: ${report.totals.total}\n`);
  process.stdout.write('[acceptance] report written: reports/acceptance-report.json\n');
  process.stdout.write('[acceptance] summary written: reports/acceptance-summary.md\n');
  return report;
}

async function main() {
  logStep('verify frontend/backend connectivity through nginx and backend');
  await runCheck('frontend home', async () => {
    const homeResponse = await fetch(`${frontendBaseUrl}`);
    assert(homeResponse.ok, `frontend home failed: ${homeResponse.status}`);
    return {
      detail: `HTTP ${homeResponse.status}`,
    };
  });

  await runCheck('backend health', async () => {
    const backendHealth = await requestJson(`${backendBaseUrl}/health`);
    assert(backendHealth.response.ok, `backend health failed: ${backendHealth.response.status}`);
    return {
      detail: `HTTP ${backendHealth.response.status}`,
    };
  });

  await runCheck('nginx /api proxy', async () => {
    const latestViaFrontend = await requestJson(`${frontendBaseUrl}/api/products/latest?limit=5`);
    assert(
      latestViaFrontend.response.ok,
      `frontend latest failed: ${latestViaFrontend.response.status}`,
    );
    assert(latestViaFrontend.json?.success === true, 'frontend latest payload invalid');
    return {
      detail: `HTTP ${latestViaFrontend.response.status}`,
    };
  });

  await runCheck('category list', async () => {
    const categoriesViaFrontend = await requestJson(`${frontendBaseUrl}/api/categories`);
    assert(
      categoriesViaFrontend.response.ok,
      `categories failed: ${categoriesViaFrontend.response.status}`,
    );
    assert(categoriesViaFrontend.json?.success === true, 'categories payload invalid');
    assert(
      (categoriesViaFrontend.json?.data?.length ?? 0) > 0,
      'category list should not be empty after docker initialization',
    );
    return {
      detail: `${categoriesViaFrontend.json?.data?.length ?? 0} categories`,
    };
  });

  await runCheck('prisma migration state', async () => {
    const unfinishedMigrationsBefore = Number(
      queryPostgresSingleValue(
        `SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
      ),
    );
    assert(
      unfinishedMigrationsBefore === 0,
      `unfinished prisma migrations remain before acceptance flow: ${unfinishedMigrationsBefore}`,
    );
    return {
      detail: `unfinished=${unfinishedMigrationsBefore}`,
    };
  });

  await runCheck('protected endpoint guard', async () => {
    const unauthorizedMe = await requestJson(`${frontendBaseUrl}/api/auth/me`);
    assert(
      unauthorizedMe.response.status === 401,
      `unauthorized me expected 401, got ${unauthorizedMe.response.status}`,
    );
    return {
      detail: `HTTP ${unauthorizedMe.response.status}`,
    };
  });

  await runCheck('unauthenticated create product blocked', async () => {
    const invalidProduct = await requestJson(`${frontendBaseUrl}/api/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        title: '',
        description: '',
        price: -1,
        location: '',
        images: [],
      }),
    });
    assert(
      invalidProduct.response.status === 401,
      `unauthenticated create expected 401, got ${invalidProduct.response.status}`,
    );
    return {
      detail: `HTTP ${invalidProduct.response.status}`,
    };
  });

  logStep('register seller and buyer, then verify login and refresh cookie');
  const seller = await runCheck('register seller', async () => {
    const registeredSeller = await registerUser('2026', 'Docker Seller');
    return {
      value: registeredSeller,
      detail: `userId=${registeredSeller.user.id}`,
      businessIds: {
        userId: registeredSeller.user.id,
        studentId: registeredSeller.studentId,
      },
    };
  });

  const buyer = await runCheck('register buyer', async () => {
    const registeredBuyer = await registerUser('2025', 'Docker Buyer');
    return {
      value: registeredBuyer,
      detail: `userId=${registeredBuyer.user.id}`,
      businessIds: {
        userId: registeredBuyer.user.id,
        studentId: registeredBuyer.studentId,
      },
    };
  });

  const login = await runCheck('login', async () => {
    const loginResult = await loginUser(seller.studentId, seller.password);
    assert(loginResult.user.id === seller.user.id, 'login returned unexpected seller');
    assert(loginResult.setCookie.includes('refreshToken='), 'refresh token cookie missing');
    assert(
      !loginResult.setCookie.includes('Secure'),
      'refresh token cookie should not be Secure for local HTTP docker validation',
    );
    return {
      value: loginResult,
      detail: `userId=${loginResult.user.id}`,
      businessIds: {
        userId: loginResult.user.id,
        studentId: seller.studentId,
      },
    };
  });

  await runCheck('refresh cookie', async () => ({
    detail: 'present and usable over local HTTP',
    businessIds: {
      userId: login.user.id,
    },
  }));

  await runCheck('JWT authenticated endpoint', async () => {
    const meWithJwt = await requestJson(`${frontendBaseUrl}/api/auth/me`, {
      headers: authHeaders(login.token),
    });
    assert(meWithJwt.response.ok, `me with token failed: ${meWithJwt.response.status}`);
    assert(meWithJwt.json?.data?.studentId === seller.studentId, 'me endpoint returned wrong user');
    return {
      detail: `studentId=${meWithJwt.json.data.studentId}`,
      businessIds: {
        userId: login.user.id,
        studentId: meWithJwt.json.data.studentId,
      },
    };
  });

  await runCheck('refresh token exchange', async () => {
    const refreshWithCookie = await requestJson(`${frontendBaseUrl}/api/auth/refresh`, {
      method: 'POST',
      headers: {
        Cookie: login.setCookie.split(';')[0],
      },
    });
    assert(refreshWithCookie.response.ok, `refresh failed: ${refreshWithCookie.response.status}`);
    assert(
      refreshWithCookie.json?.data?.token,
      'refresh token exchange did not return new access token',
    );
    return {
      detail: 'success',
      businessIds: {
        userId: login.user.id,
      },
    };
  });

  logStep('upload image and verify /uploads through nginx');
  const uploadedImage = await runCheck('upload product image', async () => {
    const image = await uploadProductImage(seller.token);
    return {
      value: image,
      detail: image.url,
      businessIds: {
        filename: image.filename,
      },
    };
  });

  await runCheck('nginx /uploads proxy', async () => {
    const uploadedViaFrontend = await fetch(`${frontendBaseUrl}${uploadedImage.url}`);
    assert(
      uploadedViaFrontend.ok,
      `uploaded image via frontend failed: ${uploadedViaFrontend.status}`,
    );
    return {
      detail: `HTTP ${uploadedViaFrontend.status}`,
      businessIds: {
        filename: uploadedImage.filename,
      },
    };
  });

  await runCheck('backend uploads static route', async () => {
    const uploadedViaBackend = await fetch(`${backendBaseUrl}${uploadedImage.url}`);
    assert(
      uploadedViaBackend.ok,
      `uploaded image via backend failed: ${uploadedViaBackend.status}`,
    );
    return {
      detail: `HTTP ${uploadedViaBackend.status}`,
      businessIds: {
        filename: uploadedImage.filename,
      },
    };
  });

  await runCheck('upload volume file', async () => {
    const uploadCheck = runDockerCompose([
      'exec',
      '-T',
      'backend',
      'sh',
      '-lc',
      `test -f /app/uploads/products/${uploadedImage.filename} && echo exists`,
    ]);
    assert(uploadCheck.includes('exists'), 'uploaded file missing inside backend volume');
    return {
      detail: uploadedImage.filename,
      businessIds: {
        filename: uploadedImage.filename,
      },
    };
  });

  logStep('create, query, update, and re-query product');
  const createdProduct = await runCheck('create product', async () => {
    const createProduct = await requestJson(`${frontendBaseUrl}/api/products`, {
      method: 'POST',
      headers: authHeaders(seller.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: 'Docker Acceptance Product',
        description: 'Created during docker acceptance validation.',
        price: 88,
        originalPrice: 128,
        location: 'Library Gate',
        images: [uploadedImage.url],
      }),
    });
    assert(createProduct.response.ok, `create product failed: ${createProduct.response.status}`);
    assert(createProduct.json?.success === true, 'create product payload invalid');
    return {
      value: createProduct.json.data,
      detail: `productId=${createProduct.json.data.id}`,
      businessIds: {
        productId: createProduct.json.data.id,
      },
    };
  });

  await runCheck('product list contains new product', async () => {
    const productList = await requestJson(
      `${frontendBaseUrl}/api/products?page=0&size=20&sort=latest`,
    );
    assert(productList.response.ok, `product list failed: ${productList.response.status}`);
    const listedProduct = productList.json?.data?.content?.find(
      (product) => product.id === createdProduct.id,
    );
    assert(listedProduct, 'created product missing from product list');
    return {
      detail: `productId=${createdProduct.id}`,
      businessIds: {
        productId: createdProduct.id,
      },
    };
  });

  await runCheck('product detail', async () => {
    const productDetail = await requestJson(`${frontendBaseUrl}/api/products/${createdProduct.id}`);
    assert(productDetail.response.ok, `product detail failed: ${productDetail.response.status}`);
    assert(
      productDetail.json?.data?.id === createdProduct.id,
      'product detail returned wrong product',
    );
    return {
      detail: `productId=${productDetail.json.data.id}`,
      businessIds: {
        productId: productDetail.json.data.id,
      },
    };
  });

  await runCheck('update product', async () => {
    const updateProduct = await requestJson(
      `${frontendBaseUrl}/api/products/${createdProduct.id}`,
      {
        method: 'PUT',
        headers: authHeaders(seller.token, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          title: 'Docker Acceptance Product Updated',
          price: 99,
          description: 'Updated during docker acceptance validation.',
          location: 'North Gate',
          images: [uploadedImage.url],
        }),
      },
    );
    assert(updateProduct.response.ok, `update product failed: ${updateProduct.response.status}`);
    assert(
      updateProduct.json?.data?.title === 'Docker Acceptance Product Updated',
      'product update did not persist',
    );
    return {
      detail: `newPrice=${updateProduct.json.data.price}`,
      businessIds: {
        productId: createdProduct.id,
      },
    };
  });

  await runCheck('seller my products', async () => {
    const myProducts = await requestJson(`${frontendBaseUrl}/api/products/my`, {
      headers: authHeaders(seller.token),
    });
    assert(myProducts.response.ok, `my products failed: ${myProducts.response.status}`);
    assert(
      myProducts.json?.data?.some((product) => product.id === createdProduct.id),
      'my products missing created product',
    );
    return {
      detail: `contains productId=${createdProduct.id}`,
      businessIds: {
        productId: createdProduct.id,
        userId: seller.user.id,
      },
    };
  });

  await runCheck('validation error response', async () => {
    const invalidCreateWithToken = await requestJson(`${frontendBaseUrl}/api/products`, {
      method: 'POST',
      headers: authHeaders(seller.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        title: 'Bad Product',
        description: 'bad',
        price: -1,
        location: 'X',
        images: [],
      }),
    });
    assert(
      invalidCreateWithToken.response.status === 400,
      `invalid create expected 400, got ${invalidCreateWithToken.response.status}`,
    );
    return {
      detail: `HTTP ${invalidCreateWithToken.response.status}`,
      businessIds: {
        userId: seller.user.id,
      },
    };
  });

  logStep('create and complete the minimal order loop');
  const createdOrder = await runCheck('create order', async () => {
    const createOrder = await requestJson(`${frontendBaseUrl}/api/orders`, {
      method: 'POST',
      headers: authHeaders(buyer.token, { 'Content-Type': 'application/json' }),
      body: JSON.stringify({
        productId: createdProduct.id,
        meetLocation: 'Cafeteria',
        contactPhone: buyer.phone,
        contactName: 'Docker Buyer',
        remark: 'acceptance test order',
      }),
    });
    assert(createOrder.response.ok, `create order failed: ${createOrder.response.status}`);
    assert(createOrder.json?.success === true, 'create order payload invalid');
    return {
      value: createOrder.json.data,
      detail: `orderId=${createOrder.json.data.id}`,
      businessIds: {
        orderId: createOrder.json.data.id,
        productId: createdProduct.id,
      },
    };
  });

  await runCheck('buyer order list', async () => {
    const buyerOrders = await requestJson(`${frontendBaseUrl}/api/orders/me`, {
      headers: authHeaders(buyer.token),
    });
    assert(buyerOrders.response.ok, `buyer orders failed: ${buyerOrders.response.status}`);
    assert(
      buyerOrders.json?.data?.some((order) => order.id === createdOrder.id),
      'buyer order list missing order',
    );
    return {
      detail: `contains orderId=${createdOrder.id}`,
      businessIds: {
        orderId: createdOrder.id,
        userId: buyer.user.id,
      },
    };
  });

  await runCheck('seller sales list', async () => {
    const sellerOrders = await requestJson(`${frontendBaseUrl}/api/orders/my/sales`, {
      headers: authHeaders(seller.token),
    });
    assert(sellerOrders.response.ok, `seller orders failed: ${sellerOrders.response.status}`);
    assert(
      sellerOrders.json?.data?.some((order) => order.id === createdOrder.id),
      'seller sales list missing order',
    );
    return {
      detail: `contains orderId=${createdOrder.id}`,
      businessIds: {
        orderId: createdOrder.id,
        userId: seller.user.id,
      },
    };
  });

  await runCheck('ship order', async () => {
    const shipOrder = await requestJson(`${frontendBaseUrl}/api/orders/${createdOrder.id}/ship`, {
      method: 'POST',
      headers: authHeaders(seller.token),
    });
    assert(shipOrder.response.ok, `ship order failed: ${shipOrder.response.status}`);
    assert(shipOrder.json?.data?.status === 'SHIPPED', 'order status did not become SHIPPED');
    return {
      detail: shipOrder.json.data.status,
      businessIds: {
        orderId: createdOrder.id,
      },
    };
  });

  await runCheck('complete order', async () => {
    const completeOrder = await requestJson(
      `${frontendBaseUrl}/api/orders/${createdOrder.id}/complete`,
      {
        method: 'POST',
        headers: authHeaders(buyer.token),
      },
    );
    assert(completeOrder.response.ok, `complete order failed: ${completeOrder.response.status}`);
    assert(
      completeOrder.json?.data?.status === 'COMPLETED',
      'order status did not become COMPLETED',
    );
    return {
      detail: completeOrder.json.data.status,
      businessIds: {
        orderId: createdOrder.id,
      },
    };
  });

  await runCheck('order detail', async () => {
    const completedOrderDetail = await requestJson(
      `${frontendBaseUrl}/api/orders/${createdOrder.id}`,
      {
        headers: authHeaders(buyer.token),
      },
    );
    assert(
      completedOrderDetail.response.ok,
      `order detail failed: ${completedOrderDetail.response.status}`,
    );
    assert(
      completedOrderDetail.json?.data?.status === 'COMPLETED',
      'order detail did not persist completed status',
    );
    return {
      detail: completedOrderDetail.json.data.status,
      businessIds: {
        orderId: createdOrder.id,
      },
    };
  });

  await runCheck('product sold state', async () => {
    const soldProductDetail = await requestJson(
      `${frontendBaseUrl}/api/products/${createdProduct.id}`,
    );
    assert(
      soldProductDetail.response.ok,
      `sold product detail failed: ${soldProductDetail.response.status}`,
    );
    assert(
      soldProductDetail.json?.data?.status === 'SOLD',
      'product status did not become SOLD after completing order',
    );
    return {
      detail: soldProductDetail.json.data.status,
      businessIds: {
        orderId: createdOrder.id,
        productId: createdProduct.id,
      },
    };
  });

  logStep('restart containers and verify persistence');
  await runCheck('docker restart', async () => {
    runDockerCompose(['restart', 'postgres', 'backend', 'frontend']);
    await waitForServices();
    return {
      detail: 'postgres/backend/frontend restarted',
    };
  });

  await runCheck('product persistence', async () => {
    const persistedProduct = await requestJson(
      `${frontendBaseUrl}/api/products/${createdProduct.id}`,
    );
    assert(
      persistedProduct.response.ok,
      `persisted product failed: ${persistedProduct.response.status}`,
    );
    assert(persistedProduct.json?.data?.id === createdProduct.id, 'product missing after restart');
    return {
      detail: `productId=${createdProduct.id}`,
      businessIds: {
        productId: createdProduct.id,
      },
    };
  });

  await runCheck('order persistence', async () => {
    const persistedOrder = await requestJson(`${frontendBaseUrl}/api/orders/${createdOrder.id}`, {
      headers: authHeaders(buyer.token),
    });
    assert(persistedOrder.response.ok, `persisted order failed: ${persistedOrder.response.status}`);
    assert(persistedOrder.json?.data?.status === 'COMPLETED', 'order status lost after restart');
    return {
      detail: persistedOrder.json.data.status,
      businessIds: {
        orderId: createdOrder.id,
      },
    };
  });

  await runCheck('upload persistence', async () => {
    const persistedUpload = await fetch(`${frontendBaseUrl}${uploadedImage.url}`);
    assert(persistedUpload.ok, `persisted upload failed: ${persistedUpload.status}`);
    return {
      detail: `HTTP ${persistedUpload.status}`,
      businessIds: {
        filename: uploadedImage.filename,
      },
    };
  });

  await runCheck('upload volume persistence', async () => {
    const persistedUploadCheck = runDockerCompose([
      'exec',
      '-T',
      'backend',
      'sh',
      '-lc',
      `test -f /app/uploads/products/${uploadedImage.filename} && echo exists`,
    ]);
    assert(persistedUploadCheck.includes('exists'), 'uploaded file missing after restart');
    return {
      detail: uploadedImage.filename,
      businessIds: {
        filename: uploadedImage.filename,
      },
    };
  });

  await runCheck('prisma migration persistence', async () => {
    const unfinishedMigrationsAfterRestart = Number(
      queryPostgresSingleValue(
        `SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
      ),
    );
    assert(
      unfinishedMigrationsAfterRestart === 0,
      `unfinished prisma migrations remain after restart: ${unfinishedMigrationsAfterRestart}`,
    );
    return {
      detail: `unfinished=${unfinishedMigrationsAfterRestart}`,
    };
  });
}

main()
  .then(async () => {
    logStep('acceptance verification completed');
    await writeFinalReport();
  })
  .catch(async (error) => {
    try {
      await writeFinalReport(error);
    } catch (reportError) {
      process.stderr.write(
        `\n[acceptance] report write failed: ${reportError instanceof Error ? reportError.stack || reportError.message : String(reportError)}\n`,
      );
    }

    process.stderr.write(
      `\n[acceptance] FAILED: ${error instanceof Error ? error.stack || error.message : String(error)}\n`,
    );
    process.exitCode = 1;
  });
