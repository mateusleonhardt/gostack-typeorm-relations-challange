import { inject, injectable } from 'tsyringe';

import AppError from '@shared/errors/AppError';

import IProductsRepository from '@modules/products/repositories/IProductsRepository';
import ICustomersRepository from '@modules/customers/repositories/ICustomersRepository';
import Product from '@modules/products/infra/typeorm/entities/Product';
import Order from '../infra/typeorm/entities/Order';
import IOrdersRepository from '../repositories/IOrdersRepository';

interface IProduct {
  id: string;
  quantity: number;
}

interface IOrderProduct {
  product_id: string;
  price: number;
  quantity: number;
}

interface IRequest {
  customer_id: string;
  products: IProduct[];
}

@injectable()
class CreateOrderService {
  constructor(
    @inject('OrdersRepository')
    private ordersRepository: IOrdersRepository,

    @inject('ProductsRepository')
    private productsRepository: IProductsRepository,

    @inject('CustomersRepository')
    private customersRepository: ICustomersRepository,
  ) {}

  public async execute({ customer_id, products }: IRequest): Promise<Order> {
    const customer = await this.customersRepository.findById(customer_id);

    if (!customer) {
      throw new AppError('Customer not found');
    }

    const dbProducts: Product[] = await this.productsRepository.findAllById(
      products,
    );

    const orderProducts: IOrderProduct[] = [];
    products.forEach(product => {
      const prod = dbProducts.find(p => p.id === product.id);

      if (!prod)
        throw new AppError(`Product with id ${product.id} does not exists.`);

      if (prod.quantity < product.quantity)
        throw new AppError(
          `Product with id ${product.id} does not have enough quantity.`,
        );

      orderProducts.push({
        product_id: prod.id,
        price: prod.price,
        quantity: product.quantity,
      });

      prod.quantity -= product.quantity;
    });

    const order = await this.ordersRepository.create({
      customer,
      products: orderProducts,
    });

    await this.productsRepository.updateQuantity(dbProducts);

    return order;
  }
}

export default CreateOrderService;
