import { useState, useCallback, memo } from 'react';
import { formatINR } from '../../utils/formatters';

/**
 * OrderForm — Buy/Sell order entry form.
 * Supports Market/Limit, MIS/CNC, Stop Loss, Target.
 * Shows a confirmation modal before placing the order.
 */
function OrderForm({ symbol, currentPrice, onPlaceOrder, stockName, onOrderPlaced }) {
  const [side, setSide] = useState('BUY');
  const [quantity, setQuantity] = useState('');
  const [orderType, setOrderType] = useState('MARKET');
  const [product, setProduct] = useState('CNC');
  const [limitPrice, setLimitPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [target, setTarget] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [pendingParams, setPendingParams] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const qty = parseInt(quantity, 10);
    if (!qty || qty <= 0) {
      setError('Enter a valid quantity');
      return;
    }

    const params = {
      symbol,
      side,
      quantity: qty,
      price: currentPrice,
      type: orderType,
      limitPrice: orderType === 'LIMIT' ? parseFloat(limitPrice) : null,
      product,
      stopLoss: stopLoss ? parseFloat(stopLoss) : null,
      target: target ? parseFloat(target) : null,
    };

    // Show confirmation modal instead of placing immediately
    setPendingParams(params);
    setShowConfirm(true);
  }, [symbol, side, quantity, orderType, product, limitPrice, stopLoss, target, currentPrice]);

  const handleConfirmOrder = useCallback(async () => {
    if (!pendingParams || isSubmitting) return;
    setIsSubmitting(true);
    setShowConfirm(false);

    try {
      const result = await onPlaceOrder(pendingParams);

      if (result.success) {
        setSuccess(`${pendingParams.side} order placed for ${pendingParams.quantity} ${symbol.replace(/\.(NS|BO)$/, '')} @ ${formatINR(pendingParams.price)}`);
        setQuantity('');
        setStopLoss('');
        setTarget('');
        setLimitPrice('');
        setTimeout(() => setSuccess(''), 3000);
        // Notify parent (for toast + auto-open orders panel)
        onOrderPlaced?.({
          side: pendingParams.side,
          quantity: pendingParams.quantity,
          symbol,
          price: pendingParams.price,
          stockName: stockName || symbol?.replace(/\.(NS|BO)$/, ''),
        });
      } else {
        setError(result.error || 'Order failed');
      }
    } catch (err) {
      setError(err.message || 'Order failed');
    } finally {
      setIsSubmitting(false);
      setPendingParams(null);
    }
  }, [pendingParams, isSubmitting, onPlaceOrder, symbol, stockName, onOrderPlaced]);

  const handleCancelConfirm = useCallback(() => {
    setShowConfirm(false);
    setPendingParams(null);
  }, []);

  const estimatedValue = currentPrice * (parseInt(quantity, 10) || 0);
  const marginRequired = product === 'MIS' ? estimatedValue * 0.2 : estimatedValue;

  return (
    <div className="order-form">
      {/* Buy/Sell Toggle */}
      <div className="order-side-toggle">
        <button
          className={`side-btn buy ${side === 'BUY' ? 'active' : ''}`}
          onClick={() => setSide('BUY')}
          type="button"
        >
          BUY
        </button>
        <button
          className={`side-btn sell ${side === 'SELL' ? 'active' : ''}`}
          onClick={() => setSide('SELL')}
          type="button"
        >
          SELL
        </button>
      </div>

      {/* Product Type */}
      <div className="order-product-toggle">
        <button
          className={`product-btn ${product === 'CNC' ? 'active' : ''}`}
          onClick={() => setProduct('CNC')}
          type="button"
          title="Delivery — Hold until you sell"
        >
          Delivery
        </button>
        <button
          className={`product-btn ${product === 'MIS' ? 'active' : ''}`}
          onClick={() => setProduct('MIS')}
          type="button"
          title="Intraday — Auto square off at 3:15 PM"
        >
          Intraday
        </button>
      </div>

      <form onSubmit={handleSubmit} className="order-form-fields">
        {/* Order Type */}
        <div className="order-field-row">
          <label className="order-label">Type</label>
          <div className="order-type-toggle">
            <button
              className={`type-btn ${orderType === 'MARKET' ? 'active' : ''}`}
              onClick={() => setOrderType('MARKET')}
              type="button"
            >
              Market
            </button>
            <button
              className={`type-btn ${orderType === 'LIMIT' ? 'active' : ''}`}
              onClick={() => setOrderType('LIMIT')}
              type="button"
            >
              Limit
            </button>
          </div>
        </div>

        {/* Quantity */}
        <div className="order-field-row">
          <label className="order-label">Qty</label>
          <input
            type="number"
            className="order-input"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="0"
            min="1"
            step="1"
          />
        </div>

        {/* Limit Price (if LIMIT) */}
        {orderType === 'LIMIT' && (
          <div className="order-field-row">
            <label className="order-label">Price</label>
            <input
              type="number"
              className="order-input"
              value={limitPrice}
              onChange={(e) => setLimitPrice(e.target.value)}
              placeholder={currentPrice?.toFixed(2)}
              step="0.05"
            />
          </div>
        )}

        {/* Stop Loss */}
        <div className="order-field-row">
          <label className="order-label">SL</label>
          <input
            type="number"
            className="order-input"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            placeholder="Optional"
            step="0.05"
          />
        </div>

        {/* Target */}
        <div className="order-field-row">
          <label className="order-label">Target</label>
          <input
            type="number"
            className="order-input"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            placeholder="Optional"
            step="0.05"
          />
        </div>

        {/* Order Summary */}
        <div className="order-summary">
          <div className="order-summary-row">
            <span>Est. Value</span>
            <span className="order-summary-val">{formatINR(estimatedValue)}</span>
          </div>
          <div className="order-summary-row">
            <span>Margin Req.</span>
            <span className="order-summary-val">{formatINR(marginRequired)}</span>
          </div>
        </div>

        {/* Error / Success messages */}
        {error && <div className="order-error">{error}</div>}
        {success && <div className="order-success">{success}</div>}

        {/* Submit */}
        <button
          type="submit"
          className={`order-submit-btn ${side === 'BUY' ? 'buy' : 'sell'}`}
          disabled={!quantity || parseInt(quantity) <= 0 || isSubmitting}
        >
          {side} {stockName || symbol?.replace(/\.(NS|BO)$/, '')}
        </button>
      </form>

      {/* ── Confirmation Modal ── */}
      {showConfirm && pendingParams && (
        <div className="order-confirm-overlay" onClick={handleCancelConfirm}>
          <div className="order-confirm-modal" onClick={e => e.stopPropagation()}>
            <h3 className="order-confirm-title">Confirm Order</h3>
            <div className="order-confirm-body">
              <div className="order-confirm-row">
                <span>Action</span>
                <span className={`order-confirm-val ${pendingParams.side === 'BUY' ? 'buy' : 'sell'}`}>
                  {pendingParams.side}
                </span>
              </div>
              <div className="order-confirm-row">
                <span>Stock</span>
                <span className="order-confirm-val">{stockName || symbol?.replace(/\.(NS|BO)$/, '')}</span>
              </div>
              <div className="order-confirm-row">
                <span>Quantity</span>
                <span className="order-confirm-val">{pendingParams.quantity}</span>
              </div>
              <div className="order-confirm-row">
                <span>Price</span>
                <span className="order-confirm-val">{formatINR(pendingParams.price)}</span>
              </div>
              <div className="order-confirm-row">
                <span>Type</span>
                <span className="order-confirm-val">{pendingParams.type}</span>
              </div>
              <div className="order-confirm-row">
                <span>Product</span>
                <span className="order-confirm-val">{pendingParams.product === 'MIS' ? 'Intraday' : 'Delivery'}</span>
              </div>
              <div className="order-confirm-row total">
                <span>Est. Value</span>
                <span className="order-confirm-val">{formatINR(pendingParams.price * pendingParams.quantity)}</span>
              </div>
            </div>
            <div className="order-confirm-actions">
              <button className="order-confirm-cancel" onClick={handleCancelConfirm}>Cancel</button>
              <button
                className={`order-confirm-submit ${pendingParams.side === 'BUY' ? 'buy' : 'sell'}`}
                onClick={handleConfirmOrder}
              >
                Confirm {pendingParams.side}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(OrderForm);
