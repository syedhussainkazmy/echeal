export interface PaginationQuery {
    page?: string;
    limit?: string;
    sortOrder?: string;
}

export interface PaginationParams {
    page: number;
    limit: number;
    skip: number;
    sortOrder: 1 | -1;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNext: boolean;
        hasPrev: boolean;
    };
}

export const parsePagination = (query: PaginationQuery, defaultLimit = 10, maxLimit = 100): PaginationParams => {
    const page = Math.max(1, Number(query.page) || 1);
    const requestedLimit = Number(query.limit) || defaultLimit;
    const limit = Math.min(Math.max(1, requestedLimit), maxLimit);
    const skip = (page - 1) * limit;
    const sortOrder = query.sortOrder === 'asc' ? 1 : -1;

    return { page, limit, skip, sortOrder };
};

export const buildPaginatedResponse = <T>(
    data: T[],
    total: number,
    page: number,
    limit: number
): PaginatedResponse<T> => {
    const totalPages = Math.max(1, Math.ceil(total / limit));

    return {
        data,
        pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
        },
    };
};
