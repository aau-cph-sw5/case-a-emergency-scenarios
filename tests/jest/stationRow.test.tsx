import { fireEvent, render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';
import StationRow, { type StationRequirement } from '../../shared/components/stationRow';
import type { ActiveDeployments } from '../../shared/components/stationState';

const requirement: StationRequirement = {
  station: 'Station A',
  placement: 'Platform 1, near the elevators',
  minimumStaffing: 2,
  actions: [
    { sequence: 1, instruction: 'Meet passengers at the platform.' },
    { sequence: 2, instruction: 'Direct passengers to the exit.' },
  ],
};

describe('StationRow', () => {
  it('shows the station summary and required staffing status', () => {
    render(
      <StationRow
        requirement={requirement}
        deployments={{
          deployments: [{ fulfills: 'Station A', status: 'MANNED' }],
        }}
      />,
    );

    expect(screen.getByText('Station A - 1/2 stewards')).toBeTruthy();
    expect(screen.getByText('✕')).toBeTruthy();
    expect(screen.getByText('Last update: --:--')).toBeTruthy();
    expect(screen.queryByText('Platform 1, near the elevators')).toBeNull();
  });

  it('expands to show placement, ordered actions, and each steward status', () => {
    const deployments: ActiveDeployments = {
      deployments: [
        {
          fulfills: 'Station A',
          status: 'MANNED',
          reportedAt: '2026-10-18T09:15:00Z',
        },
      ],
    };
    render(<StationRow requirement={requirement} deployments={deployments} />);

    fireEvent.press(screen.getByText('Station A - 1/2 stewards'));

    expect(screen.getByText('Platform 1, near the elevators')).toBeTruthy();
    expect(screen.getByText('1. Meet passengers at the platform.')).toBeTruthy();
    expect(screen.getByText('2. Direct passengers to the exit.')).toBeTruthy();
    expect(screen.getByText('Steward 1: MANNED')).toBeTruthy();
    expect(screen.getByText('Steward 2: UNMANNED')).toBeTruthy();

    fireEvent.press(screen.getByText('Station A - 1/2 stewards'));
    expect(screen.queryByText('Platform 1, near the elevators')).toBeNull();
  });

  it('renders a safe fallback for an unknown runtime status', () => {
    render(
      <StationRow
        requirement={{ ...requirement, minimumStaffing: 1 }}
        deployments={{
          deployments: [
            {
              fulfills: 'Station A',
              status: 'BROKEN' as ActiveDeployments['deployments'][number]['status'],
            },
          ],
        }}
      />,
    );

    expect(screen.getByText('ERR')).toBeTruthy();
  });
});