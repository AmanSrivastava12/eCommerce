import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { CreateSaleDto, UpdateSaleDto } from './dto/sale.dto';
import { Sale, SaleDocument } from './schemas/sale.schema';

@Injectable()
export class SalesService {
  constructor(@InjectModel(Sale.name) private saleModel: Model<SaleDocument>) {}

  findAll() {
    return this.saleModel.find().sort({ startAt: -1 }).exec();
  }

  create(dto: CreateSaleDto) {
    return this.saleModel.create(dto);
  }

  async update(id: string, dto: UpdateSaleDto) {
    const sale = await this.saleModel.findByIdAndUpdate(id, { $set: dto }, { returnDocument: 'after' }).exec();
    if (!sale) throw new NotFoundException('Sale not found');
    return sale;
  }
}
