import React from 'react';
import { Pagination } from 'react-admin';

const RequestsPagination = props => (
  <Pagination rowsPerPageOptions={[10, 25, 50, 100]} {...props} />
)

export default RequestsPagination;
