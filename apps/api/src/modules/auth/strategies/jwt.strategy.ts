import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthenticatedUser } from '../../../common/decorators/current-user.decorator';

interface AccessTokenPayload {
  sub: string;
  role: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      // Pinned explicitly rather than left to the library default — without this, a
      // token crafted with a different algorithm could otherwise be a way to probe for
      // algorithm-confusion bugs. We only ever sign with HS256 (see AuthService), so the
      // verifier should never accept anything else.
      algorithms: ['HS256'],
    });
  }

  // Whatever this returns becomes `request.user` — kept to pseudonym_id + role only.
  validate(payload: AccessTokenPayload): AuthenticatedUser {
    return { userId: payload.sub, role: payload.role };
  }
}
