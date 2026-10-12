import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import type { UpdateRideValues } from '@/app/_types/ride';
import EscortSection from '../EscortSection';

const answers = [
  { id: 10, type: 'driver', direction: 'both', seats: 4, availability: true, comment: null, guardian: { id: 1, name: '運転者' } },
  { id: 20, type: 'escort', direction: 'outbound', seats: 0, availability: true, comment: null, guardian: { id: 2, name: '行きのみ引率' } },
  { id: 21, type: 'escort', direction: 'inbound', seats: 0, availability: true, comment: null, guardian: { id: 3, name: '帰りのみ引率' } },
  { id: 22, type: 'escort', direction: 'both', seats: 0, availability: true, comment: null, guardian: { id: 4, name: '往復引率' } },
];

function Harness({
  separateDirections = false,
  direction = 'outbound',
  selectedId = 0,
  empty = false,
  candidates = answers,
  onSubmit = jest.fn(),
}: {
  separateDirections?: boolean;
  direction?: 'outbound' | 'inbound';
  selectedId?: number;
  empty?: boolean;
  candidates?: typeof answers;
  onSubmit?: (values: UpdateRideValues) => void;
}) {
  const form = useForm<UpdateRideValues>({ defaultValues: {
    date: new Date('2030-01-01'), destination: '球場', separateDirections,
    drivers: [{ availabilityDriverId: 10, type: 'driver', direction, seats: 4, rideAssignments: [],
      escorts: empty ? [] : [{ availabilityDriverId: selectedId, direction, rideAssignments: [] }],
    }],
  } });
  return <FormProvider {...form}>
    <form onSubmit={form.handleSubmit(onSubmit)}>
      <EscortSection driverIndex={0} direction={direction} availabilityDrivers={candidates} />
      <button type="submit">保存</button>
    </form>
  </FormProvider>;
}

test.each([
  [false, 'outbound', ['引率者を選択', '往復引率']],
  [true, 'outbound', ['引率者を選択', '行きのみ引率', '往復引率']],
  [true, 'inbound', ['引率者を選択', '帰りのみ引率', '往復引率']],
] as const)('配車モードに対応する引率者だけ選択できる（分離=%s、方向=%s）', (separateDirections, direction, labels) => {
  render(<Harness separateDirections={separateDirections} direction={direction} />);
  expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(labels);
});

test('共通配車で片道回答しかない場合は引率枠を追加させない', () => {
  render(<Harness empty candidates={answers.filter((answer) => answer.id !== 22)} />);
  expect(screen.queryByRole('button', { name: '引率者を追加' })).not.toBeInTheDocument();
});

test('保存済み片道引率は要確認と表示し、往復可能な保護者に変更できる', async () => {
  const onSubmit = jest.fn();
  render(<Harness selectedId={20} onSubmit={onSubmit} />);
  expect(screen.getByRole('combobox', { name: '引率者' })).toHaveValue('20');
  expect(screen.getByRole('option', { name: '行きのみ引率（回答の再確認が必要）' })).toBeDisabled();
  expect(screen.getByText(/引率枠を削除してください/)).toBeInTheDocument();

  fireEvent.change(screen.getByRole('combobox', { name: '引率者' }), { target: { value: '22' } });
  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0].drivers[0].escorts[0].availabilityDriverId).toBe(22);
  expect(screen.queryByText(/引率枠を削除してください/)).not.toBeInTheDocument();
});

test('保存済み片道引率を削除して保存できる', async () => {
  const onSubmit = jest.fn();
  render(<Harness selectedId={20} onSubmit={onSubmit} />);
  fireEvent.click(screen.getByRole('button', { name: '引率者を削除' }));
  fireEvent.click(screen.getByRole('button', { name: '保存' }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalled());
  expect(onSubmit.mock.calls[0][0].drivers[0].escorts).toEqual([]);
});
