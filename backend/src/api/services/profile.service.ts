import { hash, verify } from 'argon2';

import { APIResponse, IAPIResponse, Status } from '@api-types/general.types';
import { BasicUser } from '@api-types/user.types';
import prisma from '@prisma-instance';
import {
  ChangePasswordBase64Schema,
  ChangePasswordSchema,
  jwtTokenSchema,
} from '@schemas/profile.schema';

/**
 * Service to change a user's password
 * @param {string} id - The id of the user to change the password for.
 * @param {string} newPassword - The new password for the user.
 * @param {string} oldPassword - The old password for the user.
 * @returns {Promise<IAPIResponse>} A promise that resolves to an object containing the status and message of the password change.
 */
export async function changePassword(
  id: string,
  newPassword: string,
  oldPassword: string,
): Promise<IAPIResponse> {
  try {
    // Validate
    const idValidation = ChangePasswordBase64Schema.validate({
      newPassword,
      oldPassword,
    });
    if (idValidation.error) {
      return {
        status: Status.InvalidDetails,
        message: idValidation.error.message,
      };
    }

    // Decode the passwords
    newPassword = Buffer.from(newPassword, 'base64').toString();
    oldPassword = Buffer.from(oldPassword, 'base64').toString();

    // Validate the password
    const passwordValidation = ChangePasswordSchema.validate({
      newPassword,
      oldPassword,
    });
    if (passwordValidation.error) {
      return {
        status: Status.InvalidDetails,
        message: passwordValidation.error.message,
      };
    }

    // Check is old password is correct
    const exist = await prisma.user.findUnique({
      where: { id },
    });

    if (exist) {
      const OldPasswordCorrect = await verify(exist.password, oldPassword);
      if (!OldPasswordCorrect) {
        return {
          status: Status.InvalidDetails,
          message: 'Incorrect password',
        };
      }
    } else {
      new Error('User not found');
    }

    // Hash the new password
    const hashedPassword = await hash(newPassword);

    // Update the user's password in the database
    const updateResult = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    if (!updateResult) {
      return {
        status: Status.UpdateFailed,
        message: 'Failed to update password',
      };
    }

    return {
      status: Status.Success,
      message: 'Password updated successfully',
    };
  } catch {
    return {
      status: Status.Failed,
      message: 'Something went wrong on our end',
    };
  }
}

/**
 * Service to get a user's profile
 * @param {string} accessToken - The access token for the user.
 * @returns {Promise<APIResponse<BasicUser>>} A promise that resolves to an object containing the status, message and data of the user's profile.
 */
export async function getProfile(
  accessToken: string,
): Promise<APIResponse<BasicUser>> {
  try {
    // Validate
    const tokenValidation = jwtTokenSchema.validate({ token: accessToken });
    if (tokenValidation.error) {
      return {
        status: Status.InvalidDetails,
        message: tokenValidation.error.message,
      };
    }
    const tokenData = await prisma.token.findUnique({
      where: {
        accessToken: accessToken, // Query using the access token
      },
      include: {
        session: {
          include: {
            user: {
              select: {
                id: true,
                initials: true,
                name: true,
                email: true,
                username: true,
              },
            },
          },
        },
      },
    });

    if (!tokenData) {
      return {
        status: Status.NotFound,
        message: '"User have no settings',
      };
    }

    const permission = await prisma.userPermissions.findMany({
      where: {
        userId: tokenData.session.user.id
      },
      include: {
        Permission: {
          select: {
            code: true,
            description: true
          }
        }
      }
    })

    if (!permission) {
      return {
        status: Status.NotFound,
        message: '"User have no settings',
      };
    }

    const response = { ...tokenData.session.user, permissions: permission.map(perms => (perms.Permission)) }


    return {
      data: response,
      status: Status.Found,
      message: 'Profile found',
    };
  } catch (error: unknown) {
    return {
      status: Status.Failed,
      message: 'Something went wrong on our end' + (error as Error).message,
    };
  }
}
