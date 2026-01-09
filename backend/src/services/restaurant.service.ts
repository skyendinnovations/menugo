import { restaurantRepository } from "../repositories/restaurant.respository";
import type {
  CreateRestaurantDBInput,
  CreateRestaurantDTO,
} from "../types/restaurant.types";
import { generateUniqueRestaurantSlug } from "../utils/helpers";

class RestaurantService {
  async createRestaurant(userId: string,payload: CreateRestaurantDTO) {

    const slug = await generateUniqueRestaurantSlug(payload.name);
    const dbInput: CreateRestaurantDBInput = { ...payload, slug };

    const createdRestaurant = await restaurantRepository.create(dbInput);

    await restaurantRepository.addRestaurantOwner(createdRestaurant?.id, userId);

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

  // async getMyRestaurants(userId: string) {

  //   const restaurants = await restaurantRepository.findByUserId(userId);

  //   if(!restaurants) throw new Error("No Restaurants found");

  //   return restaurants;
  // }
}

export const restaurantService = new RestaurantService();
