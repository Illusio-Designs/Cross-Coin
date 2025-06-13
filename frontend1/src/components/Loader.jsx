import React from 'react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const Loader = ({ className = '' }) => {
  return (
    <div 
      className={`flex items-center justify-center ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}
    >
      <DotLottieReact
        src="https://lottie.host/c27ada6a-8b32-448d-9ae2-5f811587fe57/zpIvP1MWDg.lottie"
        loop
        autoplay
        style={{ 
          width: '50%', 
          height: '50%'
        }}
      />
    </div>
  );
};

export default Loader; 