/**
 * LabelForge Database & Serialization Types
 */

export interface DatabaseField {
  name: string;
  type: 'string' | 'number' | 'date' | 'boolean';
  sampleValue: string;
  description?: string;
}

export interface DataRecord {
  id: string | number;
  [key: string]: any;
}

export type DataSourceType = 'csv' | 'json' | 'sql' | 'sqlite' | 'rest' | 'embedded';

export interface DataSourceDefinition {
  id: string;
  name: string;
  type: DataSourceType;
  description?: string;
  connected?: boolean;
  status?: string;
  fields: (DatabaseField | { name: string; type: string; sample?: string })[];
  records: DataRecord[];
  currentRecordIndex: number;
  totalRecords?: number;
  queryOrFilter?: string;
}

export interface SerializationCounter {
  id: string;
  name: string;
  currentValue: number;
  increment: number;
  step?: number;
  padLength: number;
  padding?: number;
  prefix: string;
  suffix: string;
  resetInterval: 'never' | 'daily' | 'job' | 'limit';
  maxLimit?: number;
}
