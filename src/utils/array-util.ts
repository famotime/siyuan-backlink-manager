export function isArrayEmpty<T>(array: T[]): boolean {
    return !array || array.length == 0;
}


export function isArrayNotEmpty<T>(array: T[]): boolean {
    return Array.isArray(array) && array.length > 0;
}

export function isSetEmpty<T>(set: Set<T>): boolean {
    return !set || set.size == 0;
}

export function isSetNotEmpty<T>(set: Set<T>): boolean {
    return set && set.size > 0;
}

// 求交集。
export function intersectionSet<T>(set1: Set<T>, set2: Set<T>): T[] {
    if (isSetEmpty(set1) || isSetEmpty(set2)) {
        return [];
    }

    const result = [];
    for (const item of set1) {
        if (set2.has(item)) {
            result.push(item);
        }
    }
    return result;
}
