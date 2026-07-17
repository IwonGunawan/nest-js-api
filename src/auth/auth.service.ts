import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from '../common/entities/user.entity';
import { LoginDto } from './dtos/login.dto';
import { ChangePasswordDto } from './dtos/change-password.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const user = await this.userRepo.findOne({
      where: { email: dto.email, deleted: '0' },
    });

    if (!user) throw new UnauthorizedException('Akun tidak ditemukan');

    if (user.status === '1')
      throw new UnauthorizedException('Akun tidak aktif');

    const isMatch = await bcrypt.compare(dto.password, user.password);
    if (!isMatch) throw new UnauthorizedException('Password salah');

    return this.generateToken(user);
  }

  async loginWithGoogle(googleUser: { email: string; name: string }) {
    const user = await this.userRepo.findOne({
      where: { email: googleUser.email, deleted: '0' },
    });

    // Kalau user belum ada, tolak — admin harus daftarkan dulu
    if (!user)
      throw new UnauthorizedException(
        'Akun tidak ditemukan. Hubungi administrator.',
      );

    if (user.status === '1')
      throw new UnauthorizedException('Akun tidak aktif');

    return this.generateToken(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    if (dto.oldPassword === dto.newPassword) {
      throw new BadRequestException(
        'Password baru tidak boleh sama dengan password lama',
      );
    }

    const user = await this.userRepo.findOne({
      where: { id: userId, deleted: '0' },
    });

    if (!user) throw new UnauthorizedException('Akun tidak ditemukan');

    if (user.status === '1')
      throw new UnauthorizedException('Akun tidak aktif');

    const isMatch = await bcrypt.compare(dto.oldPassword, user.password);
    if (!isMatch) throw new UnauthorizedException('Password lama salah');

    user.password = await bcrypt.hash(dto.newPassword, 10);
    user.modifiedAt = new Date();
    user.modifiedBy = user.name;

    const saved = await this.userRepo.save(user);

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password: _, ...result } = saved;
    return {
      message: 'Password berhasil diubah',
      user: result,
    };
  }

  private generateToken(user: User) {
    const payload = { id: user.id, email: user.email, level: user.level };
    return {
      access_token: this.jwtService.sign(payload),
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        level: user.level, // '0': admin, '1': operator
      },
    };
  }
}
