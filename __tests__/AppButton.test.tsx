import { fireEvent, render, screen } from '@testing-library/react-native';

import { AppButton } from '../src/components/AppButton';

describe('AppButton', () => {
  it('calls onPress when pressed', async () => {
    const onPress = jest.fn();
    await render(<AppButton title="Save" onPress={onPress} />);
    await fireEvent.press(screen.getByText('Save'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('ignores presses while disabled', async () => {
    const onPress = jest.fn();
    await render(<AppButton title="Save" onPress={onPress} disabled />);
    await fireEvent.press(screen.getByText('Save'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('ignores presses while loading and hides the title', async () => {
    const onPress = jest.fn();
    await render(<AppButton title="Save" onPress={onPress} loading />);
    expect(screen.queryByText('Save')).toBeNull();
    await fireEvent.press(screen.getByRole('button'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
