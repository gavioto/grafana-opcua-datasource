import React, { PureComponent, ChangeEvent } from 'react';
import { SegmentAsync, RadioButtonGroup, Input, TabsBar, TabContent, Tab } from '@grafana/ui';
import { CascaderOption } from 'rc-cascader/lib/Cascader';
import { TreeEditor } from './components/TreeEditor';
import { QueryEditorProps, SelectableValue } from '@grafana/data';
import { ButtonCascader } from './components/ButtonCascader/ButtonCascader';
import { DataSource } from './DataSource';
import { EventColumn, EventFilter, OpcUaQuery, OpcUaDataSourceOptions, OpcUaBrowseResults, separator } from './types';
import { SegmentFrame, SegmentLabel } from './components/SegmentFrame';
import { css } from 'emotion';
import { EventField, EventFieldTable } from './components/EventFieldTable';
import { AddEventFieldForm } from './components/AddEventFieldForm';
import { EventFilterTable } from './components/EventFilterTable';
import { AddEventFilter } from './components/AddEventFilter';

const rootNode = 'i=85';
const eventTypesNode = 'i=3048';
const selectText = (t: string): string => `Select <${t}>`;

type Props = QueryEditorProps<DataSource, OpcUaQuery, OpcUaDataSourceOptions>;
type State = {
  options: CascaderOption[];
  value: string[];
  eventTypeNodeId: string;
  eventOptions: CascaderOption[];
  eventTypes: string[];
  eventFields: EventField[];
  eventFilters: EventFilter[];

  tabs: Array<{ label: string; active: boolean }>;
};

const tabMarginBox = css(`
{
  border-left: 1px solid #202226;
  border-right: 1px solid #202226;
  border-bottom: 1px solid #202226;
  background: #141414;
}
`);

const tabMarginHeader = css(`
  background: #141414;
`);

export class QueryEditor extends PureComponent<Props, State> {
  constructor(props: Props) {
    super(props);

    this.state = {
      options: [],
      value: this.props.query.value || ['Select to browse OPC UA Server'],
      eventTypes: [],
      eventOptions: [],
      eventFields: this.buildEventFields(),
      eventTypeNodeId: '',
      eventFilters: [],
      tabs: [
        { label: 'Traditional', active: true },
        { label: 'Tree view', active: false },
      ],
    };

    props.datasource.getResource('browse', { nodeId: rootNode }).then((results: OpcUaBrowseResults[]) => {
      console.log('Results', results);
      this.setState({
        options: results.map((r: OpcUaBrowseResults) => this.toCascaderOption(r)),
      });
    });

    props.datasource.getResource('browseTypes', { nodeId: eventTypesNode }).then((results: OpcUaBrowseResults[]) => {
      console.log('Results', results);
      this.setState({
        eventOptions: results.map((r: OpcUaBrowseResults) => this.toCascaderOption(r)),
      });
    });
  }

  buildEventFields = (): EventField[] => {
    return [
      { alias: '', browsename: 'Time' },
      { alias: '', browsename: 'EventId' },
      { alias: '', browsename: 'EventType' },
      { alias: '', browsename: 'SourceName' },
      { alias: '', browsename: 'Message' },
      { alias: '', browsename: 'Severity' },
    ];
  };

  onChangeField = (field: string, sval: SelectableValue<any> | string, ...args: any[]) => {
    const { datasource, query, onChange, onRunQuery } = this.props;
    const { nodeId, refId } = query;

    console.log('change', field, sval, args);
    const changes: Record<string, any> = {};

    if (typeof sval === 'string') {
      changes[field] = sval;
    } else {
      changes[field] = sval.value;
    }

    if (changes[field] === 'Subscribe') {
      datasource.getResource('subscribe', { nodeId, refId }).then((results: any[]) => {
        console.log('We got subscribe results', results);
        onChange({ ...query, ...changes });
        onRunQuery();
      });
    } else {
      onChange({ ...query, ...changes });
      onRunQuery();
    }
  };

  onChange = (selected: string[], selectedItems: CascaderOption[]) => {
    const { query, onChange, onRunQuery } = this.props;
    const value = selectedItems.map(item => (item.label ? item.label.toString() : ''));
    const nodeId = selected[selected.length - 1];
    this.setState({ value });
    onChange({
      ...query,
      value,
      nodeId,
    });
    onRunQuery();
  };

  toEventColumns = (r: EventField): EventColumn => {
    return {
      browseName: r.browsename,
      alias: r.alias,
    };
  };

  //deep copy
  toEventFilter = (r: EventFilter): EventFilter => {
    return {
      oper: r.oper,
      operands: r.operands.slice(),
    };
  };

  onChangeEventType = (selected: string[], selectedItems: CascaderOption[]) => {
    const evtTypes = selectedItems.map(item => (item.label ? item.label.toString() : ''));
    const nid = selected[selected.length - 1];
    this.setState({ eventTypeNodeId: nid, eventTypes: evtTypes }, () => this.updateEventQuery());
  };

  onSelect = (val: string) => {
    console.log('onSelect', val);
  };

  onChangeInterval = (event: ChangeEvent<HTMLInputElement>) => {
    const { onChange, query } = this.props;
    onChange({ ...query, interval: event.target.value });
  };

  toCascaderOption = (opcBrowseResult: OpcUaBrowseResults, children?: CascaderOption[]): CascaderOption => {
    console.log('browse Result', opcBrowseResult);
    return {
      label: opcBrowseResult.displayName,
      value: opcBrowseResult.nodeId,
      isLeaf: !opcBrowseResult.isForward || opcBrowseResult.nodeClass === 2, //!opcBrowseResult.isForward,
    };
  };

  getChildren = (selectedOptions: CascaderOption[]) => {
    const targetOption = selectedOptions[selectedOptions.length - 1];
    targetOption.loading = true;
    if (targetOption.value) {
      this.props.datasource
        .getResource('browse', { nodeId: targetOption.value })
        .then((results: OpcUaBrowseResults[]) => {
          targetOption.loading = false;
          targetOption.children = results.map(r => this.toCascaderOption(r));
          this.setState({
            options: [...this.state.options],
          });
        });
    }
  };

  getEventTypes = (selectedOptions: CascaderOption[]) => {
    const targetOption = selectedOptions[selectedOptions.length - 1];
    targetOption.loading = true;
    if (targetOption.value) {
      this.props.datasource
        .getResource('browseTypes', { nodeId: targetOption.value })
        .then((results: OpcUaBrowseResults[]) => {
          targetOption.loading = false;
          targetOption.children = results.map(r => this.toCascaderOption(r));
          this.setState({
            eventOptions: [...this.state.eventOptions],
          });
        });
    }
  };

  browseNodeSV = (nodeId: string): Promise<Array<SelectableValue<any>>> => {
    return this.props.datasource.getResource('browse', { nodeId }).then((results: OpcUaBrowseResults[]) => {
      return results.map((item: OpcUaBrowseResults) => {
        return {
          label: item.displayName,
          key: item.nodeId,
          description: item.displayName,
          value: {
            name: item.displayName,
            nodeId: item.nodeId,
          },
        };
      });
    });
  };

  get readTypeOptions(): Array<SelectableValue<string>> {
    return [
      { label: 'Raw', value: 'ReadDataRaw' },
      { label: 'Processed', value: 'ReadDataProcessed' },
      { label: 'Realtime', value: 'ReadNode' },
      { label: 'Subscription', value: 'Subscribe' },
      { label: 'Events', value: 'ReadEvents' },
    ];
  }

  readTypeValue = (readType: string): string => {
    const foundVal: SelectableValue<string> | undefined = this.readTypeOptions.find(
      (o: SelectableValue<string>) => o.value === readType
    );
    if (foundVal && foundVal.label) {
      return foundVal.label;
    } else {
      return 'Processed';
    }
  };

  handleDeleteSelectField = (idx: number) => {
    let tempArray = this.state.eventFields.slice();
    tempArray.splice(idx, 1);
    this.setState({ eventFields: tempArray }, () => this.updateEventQuery());
  };

  handleDeleteEventFilter = (idx: number) => {
    let tempArray = this.state.eventFilters.slice();
    tempArray.splice(idx, 1);
    this.setState({ eventFilters: tempArray }, () => this.updateEventQuery());
  };

  updateEventQuery = () => {
    const { query, onChange, onRunQuery } = this.props;

    let eventColumns = this.state.eventFields.map(c => this.toEventColumns(c));
    let evtTypes = this.state.eventTypes;
    let nid = this.state.eventTypeNodeId;
    let eventFilters = this.state.eventFilters.map(c => this.toEventFilter(c));
    let eventQuery = {
      eventTypeNodeId: nid,
      eventTypes: evtTypes,
      eventColumns: eventColumns,
      eventFilters: eventFilters,
    };
    onChange({
      ...query,
      eventQuery: eventQuery,
    });
    onRunQuery();
  };

  addSelectField = (browsename: string, alias: string) => {
    let tempArray = this.state.eventFields.slice();

    tempArray.push({ browsename: browsename, alias: alias });
    this.setState({ eventFields: tempArray }, () => this.updateEventQuery());
  };

  addEventFilter = (eventFilter: EventFilter) => {
    let tempArray = this.state.eventFilters.slice();
    tempArray.push(eventFilter);
    this.setState({ eventFilters: tempArray }, () => this.updateEventQuery());
  };

  optionalParams = (query: OpcUaQuery, onRunQuery: () => void): JSX.Element => {
    const readTypeValue = this.readTypeValue(query.readType);
    switch (readTypeValue) {
      case 'Processed': {
        return (
          <>
            <SegmentLabel label={'Aggregate'} marginLeft />
            <SegmentAsync
              value={query.aggregate?.name ?? selectText('aggregate')}
              loadOptions={() => this.browseNodeSV('i=11201')}
              onChange={e => this.onChangeField('aggregate', e)}
            />
          </>
        );
      }
      case 'Raw': {
        return (
          <>
            <SegmentLabel label="Max Values" marginLeft />
            <Input
              width={10}
              value={-1}
              onChange={() => console.log('not implemented yet')}
              onBlur={() => onRunQuery()}
            />
          </>
        );
      }

      default: {
        return <></>;
      }
    }
  };

  renderEvents = (query: OpcUaQuery, onRunQuery: () => void): JSX.Element => {
    const { options, value } = this.state;
    return (
      <>
        <RadioButtonGroup
          options={this.readTypeOptions}
          value={query.readType}
          onChange={e => e && this.onChangeField('readType', e)}
        />
        <br />
        <SegmentFrame label="Event Source">
          <div onBlur={e => console.log('onBlur', e)}>
            <ButtonCascader
              //className="query-part"
              value={value}
              loadData={this.getChildren}
              options={options}
              onChange={this.onChange}
            >
              {value.join(separator)}
            </ButtonCascader>
          </div>
        </SegmentFrame>
        <SegmentFrame label="Event Type">
          <ButtonCascader
            //className="query-part"
            value={this.state.eventTypes}
            loadData={this.getEventTypes}
            options={this.state.eventOptions}
            onChange={this.onChangeEventType}
          >
            {this.state.eventTypes.join(separator)}
          </ButtonCascader>
        </SegmentFrame>
        <br />
        <EventFieldTable rows={this.state.eventFields} ondelete={(idx: number) => this.handleDeleteSelectField(idx)} />
        <br />
        <AddEventFieldForm add={(browsename: string, alias: string) => this.addSelectField(browsename, alias)} />
        <br />
        <EventFilterTable
          rows={this.state.eventFilters}
          ondelete={(idx: number) => {
            this.handleDeleteEventFilter(idx);
          }}
        />
        <br />
        <AddEventFilter
          add={(eventFilter: EventFilter) => {
            this.addEventFilter(eventFilter);
          }}
        />
      </>
    );
  };

  renderOriginal = () => {
    const { query, onRunQuery } = this.props;
    const { options, value } = this.state;
    const readTypeValue = this.readTypeValue(query.readType);
    if (readTypeValue === 'Events') {
      return this.renderEvents(query, onRunQuery);
    } else {
      return (
        <>
          <SegmentFrame label="Tag">
            <div onBlur={e => console.log('onBlur', e)}>
              <ButtonCascader
                //className="query-part"
                value={value}
                loadData={this.getChildren}
                options={options}
                onChange={this.onChange}
              >
                {value.join(separator)}
              </ButtonCascader>
            </div>

            <RadioButtonGroup
              options={this.readTypeOptions}
              value={query.readType}
              onChange={e => e && this.onChangeField('readType', e)}
            />
            {this.optionalParams(query, onRunQuery)}
          </SegmentFrame>
          <SegmentFrame label="Alias">
            <Input value={undefined} placeholder={'alias'} onChange={e => this.onChangeField('alias', e)} width={30} />
          </SegmentFrame>
        </>
      );
    }
  };

  renderTreeEditor = () => {
    return <TreeEditor {...this.props} />;
  };

  render() {
    const { tabs } = this.state;
    console.log('QueryEditor::render');

    return (
      <>
        <TabsBar className={tabMarginHeader}>
          {tabs.map((tab, index) => {
            return (
              <Tab
                key={index}
                label={tab.label}
                active={tab.active}
                onChangeTab={() => {
                  this.setState({
                    ...this.state,
                    tabs: tabs.map((tab, idx) => ({ ...tab, active: idx === index })),
                  });
                }}
              />
            );
          })}
        </TabsBar>
        <TabContent className={tabMarginBox}>
          {tabs[0].active && this.renderOriginal()}
          {tabs[1].active && this.renderTreeEditor()}
        </TabContent>
      </>
    );
  }
}
