export type AccessResult = {
  accessToken: {
    token: string;
    authType: 'bearer';
  };
};

export type RefreshResult = {
  refreshToken: {
    token: string;
  };
};

export type LoginAttemptsCache = {
  [key: string]: Date[];
};

/** Interface for the login request body */
export interface LoginRequestBody {
  username: string;
  password: string;
  ip: string;
}

/** Interface for the token request body */
export interface TokenRequestBody {
  token: string;
  ip: string;
}

/**
 * The request body for the logout endpoint.
 */
export interface GetAccessTokenRequestBody {
  token: string;
}

/**
 * The request body for the logout endpoint.
 */
export interface LogoutRequestBody {
  token: string;
}
