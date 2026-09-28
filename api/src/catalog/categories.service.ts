import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateCategoryDto, UpdateCategoryDto } from './dto/category.dto';
import { Category, CategoryDocument } from './schemas/category.schema';

@Injectable()
export class CategoriesService {
  constructor(@InjectModel(Category.name) private categoryModel: Model<CategoryDocument>) {}

  findAll() {
    return this.categoryModel.find().exec();
  }

  /**
   * Returns `categoryId` plus every descendant category id (children, grandchildren, ...),
   * so browsing a parent category (e.g. "Electronics") also surfaces products filed directly
   * under its subcategories (e.g. "Audio", "Wearables") instead of only exact matches.
   */
  async findWithDescendantIds(categoryId: string): Promise<Types.ObjectId[]> {
    const all = await this.categoryModel.find({}, { _id: 1, parentId: 1 }).exec();
    const childrenByParent = new Map<string, Types.ObjectId[]>();
    for (const cat of all) {
      if (!cat.parentId) continue;
      const key = String(cat.parentId);
      childrenByParent.set(key, [...(childrenByParent.get(key) ?? []), cat._id as Types.ObjectId]);
    }

    const result: Types.ObjectId[] = [];
    const queue = [new Types.ObjectId(categoryId)];
    while (queue.length > 0) {
      const current = queue.shift()!;
      result.push(current);
      queue.push(...(childrenByParent.get(String(current)) ?? []));
    }
    return result;
  }

  create(dto: CreateCategoryDto) {
    return this.categoryModel.create({
      ...dto,
      parentId: dto.parentId ? new Types.ObjectId(dto.parentId) : null,
    });
  }

  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.categoryModel
      .findByIdAndUpdate(
        id,
        { $set: { ...dto, parentId: dto.parentId ? new Types.ObjectId(dto.parentId) : dto.parentId } },
        { returnDocument: 'after' },
      )
      .exec();
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async remove(id: string) {
    const result = await this.categoryModel.findByIdAndDelete(id).exec();
    if (!result) throw new NotFoundException('Category not found');
    return { deleted: true };
  }
}
