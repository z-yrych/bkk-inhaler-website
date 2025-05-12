// pages/checkout/cancel.tsx
import React from 'react';
import Link from 'next/link';
import Head from 'next/head';

const CheckoutCancelPage: React.FC = () => {
  const containerStyle: React.CSSProperties = {
    display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', minHeight: '80vh', textAlign: 'center',
    padding: '20px', fontFamily: 'Arial, sans-serif',
  };
  const cardStyle: React.CSSProperties = {
    padding: '30px 40px', borderRadius: '8px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.1)', backgroundColor: '#fff',
    maxWidth: '600px', width: '100%',
  };
  const warningIconStyle: React.CSSProperties = {
    fontSize: '4em', color: '#ffc107', marginBottom: '10px', // Amber/Warning color
  };
   const buttonStyle: React.CSSProperties = {
    display: 'inline-block', marginTop: '25px', padding: '12px 25px',
    backgroundColor: '#0070f3', color: 'white', textDecoration: 'none',
    borderRadius: '5px', fontSize: '16px', margin: '0 10px',
  };

  return (
    <div style={containerStyle}>
      <Head>
        <title>Order Not Completed - Your Awesome Inhalers</title>
      </Head>
      <div style={cardStyle}>
        <div style={warningIconStyle}>⚠️</div>
        <h1 style={{ color: '#cc9900', fontSize: '2.2em', marginBottom: '15px' }}>Order Not Completed</h1>
        <p style={{ fontSize: '1.1em', color: '#555' }}>
          It looks like the payment process was not completed or was cancelled.
        </p>
        <p>
          Your items are still in your cart if you'd like to try checking out again.
        </p>
        <div>
          <Link href="/cart" legacyBehavior>
            <a style={buttonStyle}>View Your Cart</a>
          </Link>
          <Link href="/products" legacyBehavior>
            <a style={{...buttonStyle, backgroundColor: '#6c757d' }}>Continue Shopping</a>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default CheckoutCancelPage;