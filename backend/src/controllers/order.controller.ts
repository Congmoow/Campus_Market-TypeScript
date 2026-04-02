import { Request, Response, NextFunction } from 'express';
import type { CreateOrderRequest, OrderWithDetails } from '@campus-market/shared';
import { OrderService } from '../services/order.service';
import { successResponse } from '../utils/response.util';

export class OrderController {
  private orderService: OrderService;

  constructor() {
    this.orderService = new OrderService();
  }

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

  getMyOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const role = req.query.role as string;
      const status = req.query.status as string;

      let orders: OrderWithDetails[];
      if (role === 'SELL') {
        orders = await this.orderService.getMySalesOrders(userId);
      } else {
        orders = await this.orderService.getMyOrders(userId);
      }

      if (status && status !== 'ALL') {
        orders = orders.filter((order) => {
          if (status === 'DONE') {
            return order.status === 'COMPLETED';
          }
          return order.status === status;
        });
      }

      res.json(successResponse(orders));
    } catch (error) {
      next(error);
    }
  };

  getMySalesOrders = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const userId = req.user!.id;
      const orders = await this.orderService.getMySalesOrders(userId);
      res.json(successResponse(orders));
    } catch (error) {
      next(error);
    }
  };

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
