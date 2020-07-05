import React from 'react';

import {
  Button,
  useRefresh,
  useNotify,
  useUnselectAll,
  useDataProvider
} from 'react-admin';

const DeleteButton = ({ selectedIds }) => {
  const refresh = useRefresh();
  const notify = useNotify();
  const unselectAll = useUnselectAll();
  const dataProvider = useDataProvider();
  const resource = 'ccstore/request';

  const deleteRequests = () => dataProvider
        .delete(resource, { id: selectedIds.join(',') })
        .then(() => {
          refresh();
          notify('ra.notification.deleted', 'info', { smart_count: selectedIds.length });
          unselectAll(resource);
        })
        .catch(error => {
          notify('ra.notification.http_error', 'warning');
          console.log(error);
        });

  return <Button
            label="Delete"
            onClick={deleteRequests}
          />
};

const RequestBulkActionButtons = props => (
  <>
      <DeleteButton {...props} />
  </>
);

export default RequestBulkActionButtons;
