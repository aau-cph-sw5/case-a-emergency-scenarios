import { render, screen } from '@testing-library/react-native';
import { describe, expect, it } from '@jest/globals';
import ScenarioStationList from '../../shared/components/stationView';
import type { ActiveDeployments } from '../../shared/components/stationState';
import type { Scenario } from '../../shared/types/v1/scenario';

function createScenario(stationNames: string[], currentVersion = '1'): Scenario {
  return {
    scenarioId: 'TEST-001',
    name: 'Station list test',
    currentVersion,
    versions: [
      {
        version: '1',
        revision: 'Test revision',
        operatingPlan: { name: 'Test plan', patterns: [] },
        stationRequirements: stationNames.map((station) => ({
          station,
          placement: `${station} platform`,
          minimumStaffing: 1,
        })),
      },
    ],
  };
}

function textContent(value: unknown): string {
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.map(textContent).join('');
  }
  return '';
}

describe('ScenarioStationList', () => {
  it('orders stations by M1 then M2 fixture sequence and puts unknown stations last', () => {
    const scenario = createScenario([
      'Station G',
      'Station C',
      'Station A',
      'Station F',
      'Station B',
      'Station X',
    ]);
    const activeDeployments: ActiveDeployments = {
      deployments: [
        { fulfills: 'Station A', status: 'MANNED' },
        { fulfills: 'Station F', status: 'MANNED' },
        { fulfills: 'Station G', status: 'PENDING' },
      ],
    };

    render(
      <ScenarioStationList
        scenario={scenario}
        activeDeployments={activeDeployments}
      />,
    );

    const stationTitles = screen
      .getAllByText(/stewards$/)
      .map((element) => textContent(element.props.children));

    expect(stationTitles).toEqual([
      'Station A - 1/1 stewards',
      'Station B - 0/1 stewards',
      'Station C - 0/1 stewards',
      'Station F - 1/1 stewards',
      'Station G - 0/1 stewards',
      'Station X - 0/1 stewards',
    ]);
    expect(screen.getByText('2/6 stations covered')).toBeTruthy();
  });

  it('shows an empty count when the current scenario version is missing', () => {
    render(
      <ScenarioStationList
        scenario={createScenario(['Station A'], 'missing')}
        activeDeployments={{ deployments: [] }}
      />,
    );

    expect(screen.getByText('0/0 stations covered')).toBeTruthy();
  });
});