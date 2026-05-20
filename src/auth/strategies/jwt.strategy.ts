import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { User } from '../../common/entities/user.entity';
import { Repository } from 'typeorm';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    config: ConfigService,
    @InjectRepository(User)
    private userRepo: Repository<User>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
    });
  }

  /**
   * dipanggil otomatis setelah token berhasil di verifikasi
   * return value akan tersedia di request.user
   */
  async validate(payload: { id: number }) {
    const user = await this.userRepo.findOne({
      where: {
        id: payload.id,
        deleted: '0',
      },
    });

    if (!user) throw new UnauthorizedException();

    return user;
  }
}
