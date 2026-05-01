import { Toaster } from 'react-hot-toast';

const AppToaster = () => {
  return (
    <Toaster
      position="top-center"
      toastOptions={{
        style: {
          boxShadow: '0 25px 50px -12px oklch(0% 0 0 / 0.25)',
          backgroundColor: 'oklch(100% 0 0 / 0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid oklch(100% 0 0 / 0.2)',
        },
        success: {
          style: {
            boxShadow: '0 25px 50px -12px oklch(0% 0 0 / 0.25)',
            backgroundColor: 'oklch(26.2% 0.051 172.552 / 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid oklch(26.2% 0.051 172.552 / 0.2)',
            color: 'white',
          },
        },
        error: {
          style: {
            boxShadow: '0 25px 50px -12px oklch(0% 0 0 / 0.25)',
            backgroundColor: 'oklch(27.1% 0.105 12.094 / 0.7)',
            backdropFilter: 'blur(8px)',
            border: '1px solid oklch(27.1% 0.105 12.094 / 0.2)',
            color: 'white',
          },
        },
      }}
    />
  );
};

export default AppToaster;
