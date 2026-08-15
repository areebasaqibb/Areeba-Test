/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: [
    'express', 'cors', 'bcrypt', 'jsonwebtoken', '@prisma/client', 'prisma',
    'openai', 'node-vibrant', 'chroma-js', 'multer', 'dotenv',
    'cheerio', 'duck-duck-scrape', 'google-it',
    'serverless-http', 'pg', '@prisma/adapter-pg', 'axios'
  ],
};

export default nextConfig;
