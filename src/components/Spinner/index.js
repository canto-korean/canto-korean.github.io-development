import React from 'react';


export default function Spinner (props) {
    return (
      <div className="spinner">
        <div className="spinner__spinner"></div>
        {props.children ? <div className="spinner__text">{props.children}</div> : ''}
      </div>
    );
}
