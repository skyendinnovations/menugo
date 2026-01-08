import { restaurantRepository } from "../repositories/restaurant.respository";
import type { CreateRestaurantDBInput, CreateRestaurantDTO } from "../types/restaurant.types";

class RestaurantService {
    async createRestaurant(payload : CreateRestaurantDTO) {
        
        const slug = payload.name.toLowerCase().replace(/\s+/g, "-");
        const dbInput : CreateRestaurantDBInput= {...payload, slug};
        
        return restaurantRepository.create(dbInput);
    }
}

export const restaurantService = new RestaurantService();