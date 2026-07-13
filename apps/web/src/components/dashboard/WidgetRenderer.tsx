'use client';

import type {
  ActionWidget,
  ChartWidget,
  ComplianceWidget,
  DomainWidget,
  HealthWidget,
  RiskWidget,
  SecurityWidget,
  TableWidget,
} from '@opsedge360/shared-types';
import {
  ActionWidgetsGrid,
  ComplianceWidgetView,
  DomainWidgetView,
  HealthWidgetView,
  RiskWidgetsPanel,
  SecurityWidgetView,
  TableWidgetView,
} from './widgets/WidgetViews';
import { ChartWidgetsLazy } from './widgets/ChartWidgetsLazy';

export type WidgetContract =
  | { contract: 'HealthWidget'; widget: HealthWidget }
  | { contract: 'DomainWidget'; widget: DomainWidget; security?: SecurityWidget; compliance?: ComplianceWidget }
  | { contract: 'RiskWidget'; widgets: RiskWidget[] }
  | { contract: 'ActionWidget'; widgets: ActionWidget[] }
  | { contract: 'SecurityWidget'; widget: SecurityWidget }
  | { contract: 'ComplianceWidget'; widget: ComplianceWidget }
  | { contract: 'TableWidget'; widget: TableWidget }
  | { contract: 'ChartWidget'; widgets: ChartWidget[]; dataMode?: string };

/** Dispatches widget contracts to EIG renderers — extend here for new widget types. */
export function WidgetRenderer(props: WidgetContract) {
  switch (props.contract) {
    case 'HealthWidget':
      return <HealthWidgetView widget={props.widget} />;
    case 'DomainWidget':
      return (
        <DomainWidgetView widget={props.widget} security={props.security} compliance={props.compliance} />
      );
    case 'RiskWidget':
      return <RiskWidgetsPanel risks={props.widgets} />;
    case 'ActionWidget':
      return <ActionWidgetsGrid actions={props.widgets} />;
    case 'SecurityWidget':
      return <SecurityWidgetView widget={props.widget} />;
    case 'ComplianceWidget':
      return <ComplianceWidgetView widget={props.widget} />;
    case 'TableWidget':
      return <TableWidgetView widget={props.widget} />;
    case 'ChartWidget':
      return <ChartWidgetsLazy charts={props.widgets} dataMode={props.dataMode} />;
    default:
      return null;
  }
}
