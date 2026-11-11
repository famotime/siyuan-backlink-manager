import { isArrayEmpty } from "./array-util.ts";

export function matchKeywords(
    str: string,
    includeKeywords: string[],
    excludeKeywords: string[],
): boolean {
    // 检查每个包含关键词是否都出现在字符串中
    for (const keyword of includeKeywords) {
        if (!str.includes(keyword)) {
            return false; // 如果某个包含关键词不在字符串中，返回 false
        }
    }

    // 检查每个排除关键词是否都不出现在字符串中
    for (const keyword of excludeKeywords) {
        if (str.includes(keyword)) {
            return false; // 如果某个排除关键词在字符串中，返回 false
        }
    }

    return true; // 如果满足条件，返回 true
}



export function longestCommonSubstring(s1: string, s2: string): string {
    if (!s1 || !s2) {
        return "";
    }
    s1 = s1 ? s1 : "";
    s2 = s2 ? s2 : "";
    const len1 = s1.length;
    const len2 = s2.length;
    const dp: number[][] = Array.from({ length: len1 + 1 }, () =>
        Array(len2 + 1).fill(0),
    );

    let maxLength = 0;
    let endIndex = 0;

    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            if (s1[i - 1] === s2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1] + 1;
                if (dp[i][j] > maxLength) {
                    maxLength = dp[i][j];
                    endIndex = i;
                }
            }
        }
    }

    return s1.substring(endIndex - maxLength, endIndex);
}


export function countOccurrences(str: string, subStr: string): number {
    // 创建一个正则表达式，全局搜索指定的子字符串
    const regex = new RegExp(subStr, 'g');
    // 使用 match 方法匹配所有出现的子字符串，返回匹配结果数组
    const matches = str.match(regex);
    // 返回匹配的次数，如果没有匹配到则返回 0
    return matches ? matches.length : 0;
}

/**
 * 判定字符串是否有效
 * @param s 需要检查的字符串（或其他类型的内容）
 * @returns true / false 是否为有效的字符串
 */
export function isStrNotBlank(s: any): boolean {
    if (s == undefined || s == null || s === '') {
        return false;
    }
    return true;
}

export function isStrBlank(s: any): boolean {
    return !isStrNotBlank(s);
}


export function splitKeywordStringToArray(keywordStr: string): string[] {
    let keywordArray = [];
    if (!isStrNotBlank(keywordStr)) {
        return keywordArray;
    }
    // 分离空格
    keywordArray = keywordStr.trim().replace(/\s+/g, " ").split(" ");
    if (isArrayEmpty(keywordArray)) {
        return keywordArray;
    }
    // 去重
    keywordArray = Array.from(new Set(
        keywordArray.filter((keyword) => keyword.length > 0),
    ));
    return keywordArray;

}
