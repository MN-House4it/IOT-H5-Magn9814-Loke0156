import * as argon2 from 'argon2';

import { APIResponse, Status } from '@api-types/general.types';
import prisma from '@prisma-instance';
import { PasswordSchema } from '@schemas/password.schema';

/**
 * Service to reset a user's password
 * @async
 * @param {string} userId - The id of the user to reset the password for, extracted from the authenticated request.
 * @param {string} oldPassword - The user's current password for verification.
 * @param {string} newPassword - The new password for the user.
 * @returns {Promise<APIResponse<null>>} A promise that resolves to an object containing the status and message of the password reset.
 */
export async function resetPassword(
  userId: string,
  oldPassword: string,
  newPassword: string,
): Promise<APIResponse<null>> {
  try {
    // Validate the new password using Joi schema
    const passwordValidation = PasswordSchema.validate(newPassword);
    if (passwordValidation.error) {
      return {
        status: Status.Failed,
        message: passwordValidation.error.details[0].message, // Return the first validation error
      };
    }

    // Fetch the current user from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return {
        status: Status.NotFound,
        message: 'User not found',
      };
    }

    // Verify the old password
    const isOldPasswordCorrect = await argon2.verify(
      user.password,
      oldPassword,
    );
    if (!isOldPasswordCorrect) {
      return {
        status: Status.Failed,
        message: 'Old password is incorrect',
      };
    }

    // Hash the new password
    const hashedPassword = await argon2.hash(newPassword);

    // Update the user's password in the database
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

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
