import { Request, Response, NextFunction } from 'express';
import { OrderService } from '../services/order.service';
import { CreateOrderRequest } from '../types/shared';
import { successResponse } from '../utils/response.util';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

  /**
   * 创建订单
   * POST /api/orders
   */
  create = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const data: CreateOrderRequest = req.body;
      const order = await this.orderService.createOrder(userId, data);
      res.json(successResponse(order, '订单创建成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取订单详情
   * GET /api/orders/:id
   */
  getDetail = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const orderId = Number(req.params.id);
      const order = await this.orderService.getOrderDetail(userId, orderId);
      res.json(successResponse(order));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取我的订单列表（支持买家/卖家角色和状态筛选）
   * GET /api/orders/me?role=BUY|SELL&status=PENDING|DONE|CANCELLED
   */
  getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const role = req.query.role as string; // BUY or SELL
      const status = req.query.status as string; // PENDING, DONE, CANCELLED, etc.
      
      let orders;
      if (role === 'SELL') {
        // 作为卖家的订单
        orders = await this.orderService.getMySalesOrders(userId);
      } else {
        // 作为买家的订单（默认）
        orders = await this.orderService.getMyOrders(userId);
      }
      
      // 根据状态筛选
      if (status && status !== 'ALL') {
        orders = orders.filter((order: any) => {
          if (status === 'DONE') {
            return order.status === 'COMPLETED' || order.status === 'DONE';
          }
          return order.status === status;
        });
      }
      
      res.json(successResponse(orders));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 获取我的销售订单列表（作为卖家）
   * GET /api/orders/my/sales
   */
  getMySalesOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const orders = await this.orderService.getMySalesOrders(userId);
      res.json(successResponse(orders));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 发货（卖家操作）
   * POST /api/orders/:id/ship
   */
  ship = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const orderId = Number(req.params.id);
      const order = await this.orderService.shipOrder(userId, orderId);
      res.json(successResponse(order, '订单发货成功'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 完成订单（买家操作）
   * POST /api/orders/:id/complete
   */
  complete = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const orderId = Number(req.params.id);
      const order = await this.orderService.completeOrder(userId, orderId);
      res.json(successResponse(order, '订单完成'));
    } catch (error) {
      next(error);
    }
  };

  /**
   * 取消订单
   * POST /api/orders/:id/cancel
   */
  cancel = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const orderId = Number(req.params.id);
      const order = await this.orderService.cancelOrder(userId, orderId);
      res.json(successResponse(order, '订单已取消'));
    } catch (error) {
      next(error);
    }
  };
}
