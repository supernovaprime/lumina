import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';

@Controller('businesses')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(
    @Query('query') query?: string,
    @Query('lat') lat?: string,
    @Query('lng') lng?: string,
    @Query('radiusKm') radiusKm?: string,
    @Query('service') service?: string,
    @Query('minRating') minRating?: string,
    @Query('sort') sort?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.searchService.search({
      query,
      lat: lat ? parseFloat(lat) : undefined,
      lng: lng ? parseFloat(lng) : undefined,
      radiusKm: radiusKm ? parseFloat(radiusKm) : undefined,
      service,
      minRating: minRating ? parseFloat(minRating) : undefined,
      sort: sort as any,
      page: page ? parseInt(page) : 1,
      limit: limit ? parseInt(limit) : 20,
    });
  }
}
