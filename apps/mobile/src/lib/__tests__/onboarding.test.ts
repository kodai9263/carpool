import { familyDraftError, familyRequest, teamDraftError } from '../onboarding';

describe('チーム作成の入力チェック', () => {
  const team = { teamName: ' チームA ', pin: '1234', isMiddleSchool: false };
  it('チームIDの入力なしでチーム名とPINを受け付ける', () => {
    expect(teamDraftError(team)).toBeNull();
  });
  it('空の名前と短いPINを止める', () => {
    expect(teamDraftError({ ...team, teamName: ' ' })).not.toBeNull();
    expect(teamDraftError({ ...team, pin: '123' })).not.toBeNull();
    expect(teamDraftError({ ...team, pin: 'abcd' })).not.toBeNull();
  });
});

describe('家族登録', () => {
  it('複数の保護者と兄弟を一つの家族として送り、空の子ども欄を除く', () => {
    const draft = { guardians: [{ name: ' 保護者A ' }, { name: '保護者B' }], children: [{ name: '兄', grade: 6 }, { name: '妹', grade: 3 }, { name: '' }] };
    expect(familyDraftError(draft, 6)).toBeNull();
    expect(familyRequest(draft)).toEqual({ guardians: [{ name: '保護者A' }, { name: '保護者B' }], children: [{ name: '兄', grade: 6 }, { name: '妹', grade: 3 }] });
  });
  it('中学チームに4年生以上を送らない', () => {
    expect(familyDraftError({ guardians: [{ name: '保護者' }], children: [{ name: '子ども', grade: 4 }] }, 3)).not.toBeNull();
  });
  it('学年未設定と保護者だけの登録を許可する', () => {
    expect(familyDraftError({ guardians: [{ name: '保護者' }], children: [{ name: '子ども' }] }, 3)).toBeNull();
    expect(familyRequest({ guardians: [{ name: '保護者' }], children: [{ name: '' }] }).children).toEqual([]);
  });
  it('APIが黙って間引く同名の子どもと未入力の保護者を事前に知らせる', () => {
    expect(familyDraftError({ guardians: [{ name: '保護者' }], children: [{ name: '子ども' }, { name: ' 子ども ' }] }, 6)).not.toBeNull();
    expect(familyDraftError({ guardians: [{ name: '保護者' }, { name: ' ' }], children: [] }, 6)).not.toBeNull();
  });
  it('名前を入れ忘れた子どもの学年を黙って捨てない', () => {
    expect(familyDraftError({ guardians: [{ name: '保護者' }], children: [{ name: '', grade: 2 }] }, 6)).not.toBeNull();
  });
});
