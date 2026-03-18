import jwt from 'jsonwebtoken';

const getJwtSecret = (): string => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET is not configured');
    }
    return secret;
};

export const generateToken = (userId: string): string => {
    return jwt.sign({ id: userId }, getJwtSecret(), {
        expiresIn: '7d',
    });
};

export const verifyJwtToken = (token: string): { id: string } => {
    return jwt.verify(token, getJwtSecret()) as { id: string };
};
