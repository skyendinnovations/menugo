import { tableRepository } from "../repositories/table.repository";
import { restaurantRepository } from "../repositories/restaurant.repository";
import { AppError } from "../types";
import type {
  CreateTableDTO,
  BulkCreateTablesDTO,
  UpdateTableDTO,
} from "../types/table.types";
import { buildTableQRUrl, generateQRCodeDataURL } from "../utils/qr";

class TableService {
  async getTables(restaurantId: number) {
    return tableRepository.findByRestaurant(restaurantId);
  }

  async getTableById(id: number) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError(404, "Table not found");
    return table;
  }

  async createTable(restaurantId: number, dto: CreateTableDTO) {
    const existing = await tableRepository.findByNumber(
      restaurantId,
      dto.tableNumber
    );
    if (existing) {
      throw new AppError(
        409,
        `Table ${dto.tableNumber} already exists`
      );
    }
    return tableRepository.create(
      restaurantId,
      dto.tableNumber,
      dto.capacity ?? 4
    );
  }

  async bulkCreateTables(restaurantId: number, dto: BulkCreateTablesDTO) {
    if (dto.from > dto.to) {
      throw new AppError(400, "'from' must be less than or equal to 'to'");
    }
    return tableRepository.bulkCreate(
      restaurantId,
      dto.from,
      dto.to,
      dto.capacity ?? 4
    );
  }

  async updateTable(id: number, dto: UpdateTableDTO) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError(404, "Table not found");
    return tableRepository.update(id, dto);
  }

  async deleteTable(id: number) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError(404, "Table not found");
    return tableRepository.delete(id);
  }

  async getTableQR(id: number) {
    const table = await tableRepository.findById(id);
    if (!table) throw new AppError(404, "Table not found");

    const restaurant = await restaurantRepository.findById(table.restaurantId);
    if (!restaurant) throw new AppError(404, "Restaurant not found");

    const url = buildTableQRUrl(restaurant.slug, table.tableNumber);
    const qrDataUrl = await generateQRCodeDataURL(url);

    // Store the QR URL if not already stored
    if (!table.qrCode) {
      await tableRepository.update(id, { qrCode: url });
    }

    return { url, qrDataUrl, tableNumber: table.tableNumber };
  }
}

export const tableService = new TableService();
