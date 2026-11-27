/**
 * Delay banner.
 *
 * The banner is the only place a partner is told their job has overrun its
 * slot, so what matters is that it stays silent when there is nothing to say
 * and never invents a number.
 */

import React from 'react';
import {act, create, ReactTestRenderer} from 'react-test-renderer';
import {Text} from 'react-native';
import {DelayBanner} from '../src/components/molecules/DelayBanner';
import {SlaState} from '../src/types/api.types';

jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

const render = (props: {
  slaState: SlaState;
  minutesLate: number;
  customerNotified: boolean;
}) => {
  let tree: ReactTestRenderer;
  act(() => {
    tree = create(<DelayBanner {...props} />);
  });
  // @ts-expect-error assigned inside act
  return tree;
};

/** Every string the banner put on screen. */
const textOf = (tree: ReactTestRenderer): string =>
  tree.root
    .findAllByType(Text)
    .map(node => node.props.children)
    .flat()
    .filter(child => typeof child === 'string' || typeof child === 'number')
    .map(String)
    .join('');

describe('delay banner', () => {
  it('renders nothing while the job is on time', () => {
    const tree = render({slaState: 'ON_TIME', minutesLate: 0, customerNotified: false});
    expect(tree.toJSON()).toBeNull();
  });

  it('announces how late a running-late job is', () => {
    const tree = render({slaState: 'RUNNING_LATE', minutesLate: 18, customerNotified: false});
    const text = textOf(tree);
    expect(text).toContain('Running late');
    expect(text).toContain('18');
    expect(text).toContain('Mark Arrived');
  });

  it('tells the partner a breached slot will be closed', () => {
    const tree = render({slaState: 'BREACHED', minutesLate: 99, customerNotified: true});
    const text = textOf(tree);
    expect(text).toContain('Slot missed');
    expect(text).toContain('99');
    expect(text).toContain('rebook at no charge');
  });

  it('only claims the customer was told once the backend stamped it', () => {
    const told = textOf(
      render({slaState: 'RUNNING_LATE', minutesLate: 20, customerNotified: true}),
    );
    const notTold = textOf(
      render({slaState: 'RUNNING_LATE', minutesLate: 20, customerNotified: false}),
    );
    expect(told).toContain('The customer has been told');
    expect(notTold).not.toContain('The customer has been told');
  });

  it('shows the backend number verbatim, including zero', () => {
    // The backend rounds; the app must not re-derive or pad the figure.
    const text = textOf(
      render({slaState: 'RUNNING_LATE', minutesLate: 0, customerNotified: false}),
    );
    expect(text).toContain('0 min');
  });
});
