import { PartialType } from '@nestjs/swagger';
import { CreateCustomerDto } from './create-customer.dto';

// PartialType membuat semua field dari CreateCustomerDto menjadi optional
// ini pattern standard NestJS untuk update DTO
export class UpdateCustomerDto extends PartialType(CreateCustomerDto) {}
