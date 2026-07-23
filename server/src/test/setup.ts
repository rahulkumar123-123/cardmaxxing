process.env.NODE_ENV = 'test';
process.env.DATABASE_URL ??= 'postgresql://postgres:postgres@127.0.0.1:5432/cardmaxxing_test';
process.env.JWT_ACCESS_SECRET ??= 'test_access_secret_that_is_long_enough_here';
process.env.JWT_REFRESH_SECRET ??= 'test_refresh_secret_that_is_long_enough_x';
process.env.CORS_ORIGIN ??= 'http://localhost:5173';
process.env.BCRYPT_ROUNDS ??= '4';
