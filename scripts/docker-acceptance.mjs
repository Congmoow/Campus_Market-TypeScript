import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');

const frontendBaseUrl = process.env.DOCKER_ACCEPTANCE_FRONTEND_URL || 'http://localhost';
const backendBaseUrl = process.env.DOCKER_ACCEPTANCE_BACKEND_URL || 'http://localhost:3000';

const results = [];

function logStep(message) {
  process.stdout.write(`\n[acceptance] ${message}\n`);
}

function record(name, detail) {
  results.push({ name, detail });
  process.stdout.write(`  - ${name}: ${detail}\n`);
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
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

async function main() {
  logStep('verify frontend/backend connectivity through nginx and backend');
  const homeResponse = await fetch(`${frontendBaseUrl}`);
  assert(homeResponse.ok, `frontend home failed: ${homeResponse.status}`);
  record('frontend home', `HTTP ${homeResponse.status}`);

  const backendHealth = await requestJson(`${backendBaseUrl}/health`);
  assert(backendHealth.response.ok, `backend health failed: ${backendHealth.response.status}`);
  record('backend health', `HTTP ${backendHealth.response.status}`);

  const latestViaFrontend = await requestJson(`${frontendBaseUrl}/api/products/latest?limit=5`);
  assert(
    latestViaFrontend.response.ok,
    `frontend latest failed: ${latestViaFrontend.response.status}`,
  );
  assert(latestViaFrontend.json?.success === true, 'frontend latest payload invalid');
  record('nginx /api proxy', `HTTP ${latestViaFrontend.response.status}`);

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
  record('category list', `${categoriesViaFrontend.json?.data?.length ?? 0} categories`);

  const unfinishedMigrationsBefore = Number(
    queryPostgresSingleValue(
      `SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
    ),
  );
  assert(
    unfinishedMigrationsBefore === 0,
    `unfinished prisma migrations remain before acceptance flow: ${unfinishedMigrationsBefore}`,
  );
  record('prisma migration state', `unfinished=${unfinishedMigrationsBefore}`);

  const unauthorizedMe = await requestJson(`${frontendBaseUrl}/api/auth/me`);
  assert(
    unauthorizedMe.response.status === 401,
    `unauthorized me expected 401, got ${unauthorizedMe.response.status}`,
  );
  record('protected endpoint guard', `HTTP ${unauthorizedMe.response.status}`);

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
  record('unauthenticated create product blocked', `HTTP ${invalidProduct.response.status}`);

  logStep('register seller and buyer, then verify login and refresh cookie');
  const seller = await registerUser('2026', 'Docker Seller');
  const buyer = await registerUser('2025', 'Docker Buyer');
  record('register seller', `userId=${seller.user.id}`);
  record('register buyer', `userId=${buyer.user.id}`);

  const login = await loginUser(seller.studentId, seller.password);
  assert(login.user.id === seller.user.id, 'login returned unexpected seller');
  assert(login.setCookie.includes('refreshToken='), 'refresh token cookie missing');
  assert(
    !login.setCookie.includes('Secure'),
    'refresh token cookie should not be Secure for local HTTP docker validation',
  );
  record('login', `userId=${login.user.id}`);
  record('refresh cookie', 'present and usable over local HTTP');

  const meWithJwt = await requestJson(`${frontendBaseUrl}/api/auth/me`, {
    headers: authHeaders(login.token),
  });
  assert(meWithJwt.response.ok, `me with token failed: ${meWithJwt.response.status}`);
  assert(meWithJwt.json?.data?.studentId === seller.studentId, 'me endpoint returned wrong user');
  record('JWT authenticated endpoint', `studentId=${meWithJwt.json.data.studentId}`);

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
  record('refresh token exchange', 'success');

  logStep('upload image and verify /uploads through nginx');
  const uploadedImage = await uploadProductImage(seller.token);
  record('upload product image', uploadedImage.url);

  const uploadedViaFrontend = await fetch(`${frontendBaseUrl}${uploadedImage.url}`);
  assert(
    uploadedViaFrontend.ok,
    `uploaded image via frontend failed: ${uploadedViaFrontend.status}`,
  );
  record('nginx /uploads proxy', `HTTP ${uploadedViaFrontend.status}`);

  const uploadedViaBackend = await fetch(`${backendBaseUrl}${uploadedImage.url}`);
  assert(uploadedViaBackend.ok, `uploaded image via backend failed: ${uploadedViaBackend.status}`);
  record('backend uploads static route', `HTTP ${uploadedViaBackend.status}`);

  const uploadedFilename = uploadedImage.filename;
  const uploadCheck = runDockerCompose([
    'exec',
    '-T',
    'backend',
    'sh',
    '-lc',
    `test -f /app/uploads/products/${uploadedFilename} && echo exists`,
  ]);
  assert(uploadCheck.includes('exists'), 'uploaded file missing inside backend volume');
  record('upload volume file', uploadedFilename);

  logStep('create, query, update, and re-query product');
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
  const createdProduct = createProduct.json.data;
  record('create product', `productId=${createdProduct.id}`);

  const productList = await requestJson(
    `${frontendBaseUrl}/api/products?page=0&size=20&sort=latest`,
  );
  assert(productList.response.ok, `product list failed: ${productList.response.status}`);
  const listedProduct = productList.json?.data?.content?.find(
    (product) => product.id === createdProduct.id,
  );
  assert(listedProduct, 'created product missing from product list');
  record('product list contains new product', `productId=${createdProduct.id}`);

  const productDetail = await requestJson(`${frontendBaseUrl}/api/products/${createdProduct.id}`);
  assert(productDetail.response.ok, `product detail failed: ${productDetail.response.status}`);
  assert(
    productDetail.json?.data?.id === createdProduct.id,
    'product detail returned wrong product',
  );
  record('product detail', `productId=${productDetail.json.data.id}`);

  const updateProduct = await requestJson(`${frontendBaseUrl}/api/products/${createdProduct.id}`, {
    method: 'PUT',
    headers: authHeaders(seller.token, { 'Content-Type': 'application/json' }),
    body: JSON.stringify({
      title: 'Docker Acceptance Product Updated',
      price: 99,
      description: 'Updated during docker acceptance validation.',
      location: 'North Gate',
      images: [uploadedImage.url],
    }),
  });
  assert(updateProduct.response.ok, `update product failed: ${updateProduct.response.status}`);
  assert(
    updateProduct.json?.data?.title === 'Docker Acceptance Product Updated',
    'product update did not persist',
  );
  record('update product', `newPrice=${updateProduct.json.data.price}`);

  const myProducts = await requestJson(`${frontendBaseUrl}/api/products/my`, {
    headers: authHeaders(seller.token),
  });
  assert(myProducts.response.ok, `my products failed: ${myProducts.response.status}`);
  assert(
    myProducts.json?.data?.some((product) => product.id === createdProduct.id),
    'my products missing created product',
  );
  record('seller my products', `contains productId=${createdProduct.id}`);

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
  record('validation error response', `HTTP ${invalidCreateWithToken.response.status}`);

  logStep('create and complete the minimal order loop');
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
  const createdOrder = createOrder.json.data;
  record('create order', `orderId=${createdOrder.id}`);

  const buyerOrders = await requestJson(`${frontendBaseUrl}/api/orders/me`, {
    headers: authHeaders(buyer.token),
  });
  assert(buyerOrders.response.ok, `buyer orders failed: ${buyerOrders.response.status}`);
  assert(
    buyerOrders.json?.data?.some((order) => order.id === createdOrder.id),
    'buyer order list missing order',
  );
  record('buyer order list', `contains orderId=${createdOrder.id}`);

  const sellerOrders = await requestJson(`${frontendBaseUrl}/api/orders/my/sales`, {
    headers: authHeaders(seller.token),
  });
  assert(sellerOrders.response.ok, `seller orders failed: ${sellerOrders.response.status}`);
  assert(
    sellerOrders.json?.data?.some((order) => order.id === createdOrder.id),
    'seller sales list missing order',
  );
  record('seller sales list', `contains orderId=${createdOrder.id}`);

  const shipOrder = await requestJson(`${frontendBaseUrl}/api/orders/${createdOrder.id}/ship`, {
    method: 'POST',
    headers: authHeaders(seller.token),
  });
  assert(shipOrder.response.ok, `ship order failed: ${shipOrder.response.status}`);
  assert(shipOrder.json?.data?.status === 'SHIPPED', 'order status did not become SHIPPED');
  record('ship order', shipOrder.json.data.status);

  const completeOrder = await requestJson(
    `${frontendBaseUrl}/api/orders/${createdOrder.id}/complete`,
    {
      method: 'POST',
      headers: authHeaders(buyer.token),
    },
  );
  assert(completeOrder.response.ok, `complete order failed: ${completeOrder.response.status}`);
  assert(completeOrder.json?.data?.status === 'COMPLETED', 'order status did not become COMPLETED');
  record('complete order', completeOrder.json.data.status);

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
  record('order detail', completedOrderDetail.json.data.status);

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
  record('product sold state', soldProductDetail.json.data.status);

  logStep('restart containers and verify persistence');
  runDockerCompose(['restart', 'postgres', 'backend', 'frontend']);
  await waitForServices();
  record('docker restart', 'postgres/backend/frontend restarted');

  const persistedProduct = await requestJson(
    `${frontendBaseUrl}/api/products/${createdProduct.id}`,
  );
  assert(
    persistedProduct.response.ok,
    `persisted product failed: ${persistedProduct.response.status}`,
  );
  assert(persistedProduct.json?.data?.id === createdProduct.id, 'product missing after restart');
  record('product persistence', `productId=${createdProduct.id}`);

  const persistedOrder = await requestJson(`${frontendBaseUrl}/api/orders/${createdOrder.id}`, {
    headers: authHeaders(buyer.token),
  });
  assert(persistedOrder.response.ok, `persisted order failed: ${persistedOrder.response.status}`);
  assert(persistedOrder.json?.data?.status === 'COMPLETED', 'order status lost after restart');
  record('order persistence', persistedOrder.json.data.status);

  const persistedUpload = await fetch(`${frontendBaseUrl}${uploadedImage.url}`);
  assert(persistedUpload.ok, `persisted upload failed: ${persistedUpload.status}`);
  record('upload persistence', `HTTP ${persistedUpload.status}`);

  const persistedUploadCheck = runDockerCompose([
    'exec',
    '-T',
    'backend',
    'sh',
    '-lc',
    `test -f /app/uploads/products/${uploadedFilename} && echo exists`,
  ]);
  assert(persistedUploadCheck.includes('exists'), 'uploaded file missing after restart');
  record('upload volume persistence', uploadedFilename);

  const unfinishedMigrationsAfterRestart = Number(
    queryPostgresSingleValue(
      `SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NULL AND rolled_back_at IS NULL`,
    ),
  );
  assert(
    unfinishedMigrationsAfterRestart === 0,
    `unfinished prisma migrations remain after restart: ${unfinishedMigrationsAfterRestart}`,
  );
  record('prisma migration persistence', `unfinished=${unfinishedMigrationsAfterRestart}`);

  logStep('acceptance verification completed');
  process.stdout.write(`\n[acceptance] total checks: ${results.length}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `\n[acceptance] FAILED: ${error instanceof Error ? error.stack || error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
