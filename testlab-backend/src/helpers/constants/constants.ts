import dotenv from 'dotenv';

export const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET!;
export const CLICKUP_API_BASE = 'https://api.clickup.com/api/v2';
export const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://testlab-frontend.test.proxym-it.tn',
];
