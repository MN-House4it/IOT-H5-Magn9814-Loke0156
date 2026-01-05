import argon2 from 'argon2';
import { Request } from 'express';
import passport from 'passport';
import {
  ExtractJwt,
  Strategy as JwtStrategy,
  StrategyOptionsWithRequest,
} from 'passport-jwt';
import { Strategy as LocalStrategy } from 'passport-local';

import { UserToken } from '@api-types/JWTToken';
import config from '@config';
import prisma from '@prisma-instance';

const opts: StrategyOptionsWithRequest = {
  jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
  passReqToCallback: true,
  secretOrKeyProvider: (req: Request, rawJwtToken, done) => {
    done(null, config.ACCESS_TOKEN_SECRET + req.headers['x-forwarded-for']);
  },
};

passport.use(
  // eslint-disable-next-line @typescript-eslint/no-misused-promises
  new JwtStrategy(opts, async (req, jwt_payload: UserToken, done) => {
    const user = await prisma.user.findUnique({
      where: { id: jwt_payload.sub },
    });

    const accessToken = await prisma.token.findFirst({
      where: { id: jwt_payload.jti.toString() || '' },
    });

    if (user && accessToken) return done(null, user);
    else return done(401);
  }),
);

passport.use(
  new LocalStrategy(
    {
      usernameField: 'username',
      passwordField: 'password',
    },
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    async (username, password, done) => {
      try {
        // Return success for now to test
        const user = await prisma.user.findUnique({ where: { username } });
        if (!user) {
          return done(null, false, { message: 'User not found' });
        }

        if (!user.active) {
          return done(null, false, { message: 'User deactivated' });
        }

        // Validate the password using Argon2
        const validate = await argon2.verify(user.password, password);
        if (!validate) {
          return done(null, false, { message: 'Wrong Password' });
        }

        return done(null, user, { message: 'Logged in Successfully' });
      } catch (error) {
        return done(error);
      }
    },
  ),
);
