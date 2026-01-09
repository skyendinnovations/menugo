import { restaurantRepository } from "../repositories/restaurant.respository";
import type {
  CreateRestaurantDBInput,
  CreateRestaurantDTO,
} from "../types/restaurant.types";
import { generateUniqueRestaurantSlug } from "../utils/helpers";

class RestaurantService {
  async createRestaurant(payload: CreateRestaurantDTO) {
    const slug = await generateUniqueRestaurantSlug(payload.name);
    const dbInput: CreateRestaurantDBInput = { ...payload, slug };
    return restaurantRepository.create(dbInput);
  }

  async getRestaurantById(id: number) {
    const restaurant = await restaurantRepository.findById(id);

    if (!restaurant) {
      throw new Error("Restaurant not found");
    }

    return restaurant;
  }

  async getAllRestaurants() {
    return restaurantRepository.findAll();
  }

  async updateRestaurant(id: number, payload: CreateRestaurantDTO) {
    const existing = await restaurantRepository.findById(id);
    if(!existing) throw new Error("Restaurant not found");
    const slug=existing?.slug;

    const dbInput: CreateRestaurantDBInput = { ...payload, slug };
    return restaurantRepository.update(id, dbInput);
  }

  async deleteRestaurant(id: number) {
    const existing = await restaurantRepository.findById(id);
    if(!existing) throw new Error("Restaurant not found");
    return restaurantRepository.delete(id);
  }  
}

export const restaurantService = new RestaurantService();
