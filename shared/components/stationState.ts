export type Deployment = {
  fulfills: string;
  status: string;
  reportedAt?: string | null;
};

export function countManned(
  activation: { deployments: Deployment[] },
  requirements: { station: string; minimumStaffing: number }[]
) {
  return requirements.filter(
    (r) => getStationState(activation, r.station, r.minimumStaffing).current >= r.minimumStaffing
  ).length;
}

export function getStationState(
  activation: { deployments: Deployment[] },
  station: string,
  required: number
) {
  const deployments = activation.deployments.filter((d) => d.fulfills === station);

  // One status per required steward; missing ones are unmanned
  const statuses = Array.from(
    { length: Math.max(required, deployments.length) },
    (_, i) => deployments[i]?.status ?? 'UNMANNED'
  );
  const current = statuses.filter((s) => s === 'MANNED').length;
  const lastUpdate = deployments.map((d) => d.reportedAt).filter(Boolean).sort().pop();
  return { statuses, current, lastUpdate };
}

export function formatTime(iso?: string | null) {
  if (!iso) return '--:--';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}