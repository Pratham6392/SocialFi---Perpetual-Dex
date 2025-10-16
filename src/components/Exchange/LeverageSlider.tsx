import Slider, { SliderTooltip } from "rc-slider";
import cx from "classnames";
import { BASIS_POINTS_DIVISOR, MAX_ALLOWED_LEVERAGE } from "lib/legacy";
import "rc-slider/assets/index.css";
import "./LeverageSlider.css";

const leverageMarks = {
  1: "1x",
  10: "10x",
  20: "20x",
  30: "30x",
  40: "40x",
  50: "50x",
};

const leverageSliderHandle = (props) => {
  const { value, dragging, index, ...restProps } = props;
  return (
    <SliderTooltip
      prefixCls="rc-slider-tooltip"
      overlay={`${parseFloat(value).toFixed(2)}x`}
      visible={dragging}
      placement="top"
      key={index}
    >
      <Slider.Handle value={value} {...restProps} />
    </SliderTooltip>
  );
};

type Props = {
  isLong: boolean;
  setLeverageOption: (value: number) => void;
  leverageOption: number;
};

export default function LeverageSlider({ isLong, setLeverageOption, leverageOption }: Props) {
  const maxLeverage = MAX_ALLOWED_LEVERAGE / BASIS_POINTS_DIVISOR;

  const setLeveragePercent = (percent: number) => {
    const value = (maxLeverage - 1) * (percent / 100) + 1;
    setLeverageOption(value);
  };

  return (
    <div className="LeverageSlider-wrapper">
      <div className="LeverageSlider-header">
        <div className="leverage-label">Leverage</div>
        <div className="leverage-buttons">
          <button 
            className="leverage-percent-btn" 
            onClick={() => setLeverageOption(1)}
          >
            1x
          </button>
          <button 
            className="leverage-percent-btn" 
            onClick={() => setLeveragePercent(25)}
          >
            25%
          </button>
          <button 
            className="leverage-percent-btn" 
            onClick={() => setLeveragePercent(50)}
          >
            50%
          </button>
          <button 
            className="leverage-percent-btn" 
            onClick={() => setLeveragePercent(75)}
          >
            75%
          </button>
          <button 
            className="leverage-percent-btn" 
            onClick={() => setLeverageOption(maxLeverage)}
          >
            Max
          </button>
        </div>
      </div>
      <div
        className={cx("Exchange-leverage-slider", "App-slider", {
          positive: isLong,
          negative: !isLong,
        })}
      >
        <Slider
          min={1}
          max={maxLeverage}
          step={0.1}
          marks={leverageMarks}
          handle={leverageSliderHandle}
          onChange={(value) => setLeverageOption(value)}
          value={leverageOption}
        />
      </div>
      <div className="LeverageSlider-footer">
        <div className="leverage-range">
          <span>1x</span>
          <span>10x</span>
          <span>20x</span>
          <span>50x</span>
        </div>
      </div>
    </div>
  );
}
