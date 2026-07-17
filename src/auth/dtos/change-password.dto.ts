import {
  IsNotEmpty,
  IsString,
  MinLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
} from 'class-validator';

// Custom validator: field tidak boleh sama dengan field lain di object yang sama
@ValidatorConstraint({ name: 'IsDifferentFrom', async: false })
class IsDifferentFromConstraint implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments): boolean {
    const [relatedPropertyName] = args.constraints as string[];
    const relatedValue = (args.object as Record<string, unknown>)[
      relatedPropertyName
    ];
    return value !== relatedValue;
  }

  defaultMessage(args: ValidationArguments): string {
    const [relatedPropertyName] = args.constraints as string[];
    return `${args.property} tidak boleh sama dengan ${relatedPropertyName}`;
  }
}

export class ChangePasswordDto {
  @IsNotEmpty({ message: 'Password lama wajib diisi' })
  @IsString()
  oldPassword: string;

  @IsNotEmpty({ message: 'Password baru wajib diisi' })
  @IsString()
  @MinLength(6, { message: 'Password baru minimal 6 karakter' })
  @Validate(IsDifferentFromConstraint, ['oldPassword'])
  newPassword: string;
}
