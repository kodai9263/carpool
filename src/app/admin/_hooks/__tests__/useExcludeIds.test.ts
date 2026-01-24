import { getValueByPath } from "../useExcludeIds";

describe('getValueByPath', () => {
  test('単純なパスでプロパティを取得できる', () => {
    const obj = { name: '太郎', age: 10 };
    const result = getValueByPath(obj, ['name']);
    expect(result).toBe('太郎');
  });

  test('ネストされたオブジェクトのプロパティを取得できる', () => {
    const obj = {
      user: {
        profile: {
          name: '花子'
        }
      }
    };
    const result = getValueByPath(obj, ['user', 'profile', 'name']);
    expect(result).toBe('花子');
  });
  
  test('配列のインデックスでアクセスできる', () => {
    const obj = {
      items: ['りんご', 'バナナ', 'みかん']
    };
    const result = getValueByPath(obj, ['items', 1]);
    expect(result).toBe('バナナ');
  });

  test('存在しないパスの場合、undefinedを返す', () => {
    const obj = { name: '太郎' };
    const result = getValueByPath(obj, ['age']);
    expect(result).toBeUndefined();
  });

  test('途中のパスがnullの場合、undefinedを返す', () => {
    const obj = { user: null };
    const result = getValueByPath(obj, ['user', 'name']);
    expect(result).toBeUndefined();
  });

  test('途中のパスがundefinedの場合、undefinedを返す', () => {
    const obj = { user: undefined };
    const result = getValueByPath(obj, ['user', 'name']);
    expect(result).toBeUndefined();
  });

  test('空のパスの場合、オブジェクト自体を返す', () => {
    const obj = { name: '太郎' };
    const result = getValueByPath(obj, []);
    expect(result).toEqual({ name: '太郎' });
  });

  test('深くネストされたパスも正しく取得できる', () => {
    const obj = {
      level1: {
        level2: {
          level3: {
            level4: {
              value: '深い値'
            }
          }
        }
      }
    };
    const result = getValueByPath(obj, ['level1', 'level2', 'level3', 'level4', 'value']);
    expect(result).toBe('深い値');
  });

  test('数値インデックスと文字列キーの混在パス', () => {
    const obj = {
      users: [
        { name: '太郎', age: 10 },
        { name: '花子', age: 12 }
      ]
    };
    const result = getValueByPath(obj,['users', 1, 'name']);
    expect(result).toBe('花子');
  });

  test('オブジェクトがnullの場合、undefinedを返す', () => {
    const result = getValueByPath(null, ['name']);
    expect(result).toBeUndefined();
  });
});