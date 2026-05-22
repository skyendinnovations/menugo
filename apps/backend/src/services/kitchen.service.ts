import { AppError } from "../types";
import { kitchenRepository } from "../repositories/kitchen.repository";
import { db } from "@menugo/data";
import { kitchenMembers } from "@menugo/data/schemas";
import { inArray } from "drizzle-orm";

class KitchenService {
  async list(restaurantId: number) {
    const ks = await kitchenRepository.findByRestaurant(restaurantId);
    
    // Batch fetch all members for all kitchens
    const kitchenIds = ks.map(k => k.id);
    if (kitchenIds.length === 0) return [];
    
    // Fetch all members in one query
    const members = await db
      .select({ kitchenId: kitchenMembers.kitchenId, userId: kitchenMembers.userId })
      .from(kitchenMembers)
      .where(inArray(kitchenMembers.kitchenId, kitchenIds));
    
    // Map members by kitchenId
    const membersByKitchen = new Map<number, string[]>();
    for (const member of members) {
      if (!membersByKitchen.has(member.kitchenId)) {
        membersByKitchen.set(member.kitchenId, []);
      }
      membersByKitchen.get(member.kitchenId)!.push(member.userId);
    }
    
    // Build output with members attached
    const out = ks.map(k => ({
      ...k,
      memberUserIds: membersByKitchen.get(k.id) || []
    }));
    
    return out;
  }
  async create(restaurantId: number, name: string) {
    if (!name?.trim()) throw new AppError(400, "Kitchen name is required");
    return kitchenRepository.create(restaurantId, name.trim());
  }
  async update(id: number, data: { name?: string; isActive?: boolean }) {
    const k = await kitchenRepository.findById(id);
    if (!k) throw new AppError(404, "Kitchen not found");
    return kitchenRepository.update(id, data);
  }
  async delete(id: number) {
    const k = await kitchenRepository.findById(id);
    if (!k) throw new AppError(404, "Kitchen not found");
    return kitchenRepository.delete(id);
  }
  async addMember(kitchenId: number, userId: string) {
    const kitchen = await kitchenRepository.findById(kitchenId);
    if (!kitchen) throw new AppError(404, "Kitchen not found");
    return kitchenRepository.addMember(kitchenId, userId);
  }
  async removeMember(kitchenId: number, userId: string) {
    const kitchen = await kitchenRepository.findById(kitchenId);
    if (!kitchen) throw new AppError(404, "Kitchen not found");
    return kitchenRepository.removeMember(kitchenId, userId);
  }
}

export const kitchenService = new KitchenService();
