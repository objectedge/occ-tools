import React from 'react';
import EditJSONField from './EditJSONField';

const HeadersField = ({ record }) => (
  <EditJSONField json={record.request.headers} loaded onChange={data => {
    console.log(data);
  }} />
);

export default HeadersField;
