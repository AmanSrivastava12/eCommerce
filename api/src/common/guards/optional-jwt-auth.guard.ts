import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Attempts JWT auth but never rejects the request — used on routes (like cart) that
 * work for both guests and logged-in users. `req.user` is set when a valid token is
 * present, left undefined otherwise.
 */
@Injectable()
export class OptionalJwtAuthGuard extends AuthGuard('jwt') {
  handleRequest(err: any, user: any) {
    return user || undefined;
  }
}
