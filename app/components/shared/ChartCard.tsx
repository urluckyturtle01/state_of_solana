import React, { ReactNode, useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ExpandIcon, DownloadIcon, CameraIcon } from './Icons';
import { XMarkIcon, SparklesIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import PrettyLoader from './PrettyLoader';
import Loader from './Loader'
import ShareButton from './ShareButton';
import { ChartConfig } from '@/app/admin/types';
import html2canvas from 'html2canvas';
import ReactMarkdown from 'react-markdown';
import { getTrendIcon, cleanTrendText, getTrendColor } from './TrendIcons';

interface ChartCardProps {
  title: string;
  description?: string;
  children: ReactNode;
  filterBar?: ReactNode;
  legend?: ReactNode;
  onExpandClick?: () => void;
  onDownloadClick?: () => void;
  onDeleteClick?: () => void;
  isDownloading?: boolean;
  accentColor?: 'blue' | 'purple' | 'green' | 'orange' | 'indigo';
  className?: string;
  legendWidth?: '1/4' | '1/5' | '1/6';
  isLoading?: boolean;
  id?: string;
  chart?: ChartConfig;
  filterValues?: Record<string, string>;
  isEditMode?: boolean;
  dragHandleProps?: any;
  chartData?: any[];
  onSummarizeClick?: () => void;
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  children,
  filterBar,
  legend,
  onExpandClick,
  onDownloadClick,
  onDeleteClick,
  isDownloading = false,
  accentColor = 'blue',
  className = '',
  legendWidth = '1/5',
  isLoading = false,
  id,
  chart,
  filterValues,
  isEditMode = false,
  dragHandleProps,
  chartData,
  onSummarizeClick,
}) => {
  const chartRef = useRef<HTMLDivElement>(null);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rateLimitEndTime, setRateLimitEndTime] = useState<number | null>(null);
  const [remainingMinutes, setRemainingMinutes] = useState<number>(0);

  // Update remaining time every 10 seconds
  useEffect(() => {
    if (!rateLimitEndTime) {
      setRemainingMinutes(0);
      return;
    }

    const updateRemainingTime = () => {
      const now = Date.now();
      const remaining = Math.max(0, Math.ceil((rateLimitEndTime - now) / (1000 * 60)));
      setRemainingMinutes(remaining);
      
      if (remaining <= 0) {
        setRateLimitEndTime(null);
        setError(null); // Clear error when rate limit expires
      }
    };

    updateRemainingTime(); // Initial calculation
    const interval = setInterval(updateRemainingTime, 10000); // Update every 10 seconds

    return () => clearInterval(interval);
  }, [rateLimitEndTime]);

  // Screenshot function
  const handleScreenshot = async () => {
    if (!chartRef.current) return;
    
    setIsCapturing(true);
    
    // Declare watermark outside try-catch for cleanup access
    let watermark: HTMLDivElement | null = null;
    
    try {
      // Add watermark to actual DOM before capturing
      watermark = document.createElement('div');
      watermark.style.cssText = 'position: absolute !important; top: 50% !important; left: 50% !important; transform: translate(-50%, -50%) !important; opacity: 0.2 !important; pointer-events: none !important; z-index: 1000 !important; width: 120px !important; height: 42px !important;';
      watermark.innerHTML = '<svg width="120" height="42" viewBox="0 0 100 35" fill="none" xmlns="http://www.w3.org/2000/svg">' +
        '<path d="M48.2007 6.17259V13.5426H50.1828V6.17259H52.8845V4.50104H45.499V6.17259H48.2007Z" fill="white"/>' +
        '<path d="M54.1723 10.2755C54.1723 10.0138 54.1975 9.7563 54.248 9.50302C54.2986 9.24975 54.3827 9.02604 54.5005 8.83186C54.6268 8.63767 54.7909 8.48148 54.9929 8.3633C55.1949 8.23669 55.4474 8.17336 55.7504 8.17336C56.0534 8.17336 56.3059 8.23669 56.5079 8.3633C56.7183 8.48148 56.8825 8.63767 57.0003 8.83186C57.1266 9.02604 57.2149 9.24975 57.2654 9.50302C57.3159 9.7563 57.3411 10.0138 57.3411 10.2755C57.3411 10.5372 57.3159 10.7947 57.2654 11.0479C57.2149 11.2928 57.1266 11.5165 57.0003 11.7191C56.8825 11.9133 56.7183 12.0694 56.5079 12.1876C56.3059 12.3058 56.0534 12.3649 55.7504 12.3649C55.4474 12.3649 55.1949 12.3058 54.9929 12.1876C54.7909 12.0694 54.6268 11.9133 54.5005 11.7191C54.3827 11.5165 54.2986 11.2928 54.248 11.0479C54.1975 10.7947 54.1723 10.5372 54.1723 10.2755ZM52.3796 10.2755C52.3796 10.7989 52.4595 11.2717 52.6194 11.6937C52.7793 12.1159 53.0066 12.4789 53.3012 12.7828C53.5958 13.0783 53.9493 13.3062 54.3617 13.4666C54.7741 13.627 55.237 13.7072 55.7504 13.7072C56.2638 13.7072 56.7267 13.627 57.1392 13.4666C57.56 13.3062 57.9177 13.0783 58.2123 12.7828C58.5068 12.4789 58.7341 12.1159 58.894 11.6937C59.054 11.2717 59.1339 10.7989 59.1339 10.2755C59.1339 9.75206 59.054 9.27932 58.894 8.85719C58.7341 8.42664 58.5068 8.06366 58.2123 7.76814C57.9177 7.46423 57.56 7.23208 57.1392 7.07167C56.7267 6.90283 56.2638 6.81841 55.7504 6.81841C55.237 6.81841 54.7741 6.90283 54.3617 7.07167C53.9493 7.23208 53.5958 7.46423 53.3012 7.76814C53.0066 8.06366 52.7793 8.42664 52.6194 8.85719C52.4595 9.27932 52.3796 9.75206 52.3796 10.2755Z" fill="white"/>' +
        '<path d="M63.8471 12.3649C63.561 12.3649 63.3169 12.3058 63.1149 12.1876C62.9129 12.0694 62.7487 11.9175 62.6225 11.7317C62.5047 11.5376 62.4163 11.3139 62.3574 11.0606C62.3069 10.8074 62.2817 10.5498 62.2817 10.2881C62.2817 10.018 62.3069 9.7563 62.3574 9.50302C62.4079 9.24975 62.492 9.02604 62.6099 8.83186C62.7361 8.63767 62.896 8.48148 63.0896 8.3633C63.2916 8.23669 63.5399 8.17336 63.8345 8.17336C64.1206 8.17336 64.3605 8.23669 64.5542 8.3633C64.7561 8.48148 64.9202 8.64191 65.0465 8.84452C65.1727 9.03871 65.2611 9.26241 65.3116 9.51569C65.3705 9.76897 65.4 10.0264 65.4 10.2881C65.4 10.5498 65.3748 10.8074 65.3242 11.0606C65.2737 11.3139 65.1854 11.5376 65.0591 11.7317C64.9413 11.9175 64.7814 12.0694 64.5794 12.1876C64.3858 12.3058 64.1417 12.3649 63.8471 12.3649ZM60.552 6.99569V15.8346H62.3448V12.7321H62.37C62.5888 13.0529 62.8666 13.2978 63.2033 13.4666C63.5484 13.627 63.9229 13.7072 64.3269 13.7072C64.8066 13.7072 65.2233 13.6143 65.5767 13.4286C65.9387 13.2429 66.2374 12.9938 66.4731 12.6815C66.7172 12.3692 66.8982 12.0104 67.016 11.6051C67.1338 11.1999 67.1927 10.7778 67.1927 10.3388C67.1927 9.87449 67.1338 9.43126 67.016 9.00913C66.8982 8.57858 66.7172 8.20293 66.4731 7.88214C66.2291 7.56132 65.9218 7.30383 65.5515 7.10966C65.1811 6.91549 64.7393 6.81841 64.2259 6.81841C63.8219 6.81841 63.4515 6.89861 63.1149 7.05901C62.7782 7.21941 62.5005 7.4769 62.2817 7.83147H62.2564V6.99569H60.552Z" fill="white"/>' +
        '<path d="M45.499 21.1797V30.2212H51.929V28.5496H47.4811V21.1797H45.499Z" fill="white"/>' +
        '<path d="M57.4393 26.2449H54.523C54.5313 26.1183 54.5566 25.9748 54.5987 25.8144C54.6492 25.654 54.7291 25.502 54.8385 25.3585C54.9564 25.215 55.1079 25.0968 55.293 25.0039C55.4866 24.9027 55.7265 24.852 56.0127 24.852C56.4503 24.852 56.7744 24.9702 56.9848 25.2065C57.2036 25.4429 57.3551 25.789 57.4393 26.2449ZM54.523 27.3846H59.232C59.2657 26.8781 59.2236 26.3927 59.1058 25.9284C58.9879 25.4641 58.7944 25.0503 58.525 24.6874C58.2641 24.3243 57.9275 24.0373 57.515 23.8263C57.1026 23.6067 56.6186 23.497 56.0631 23.497C55.5666 23.497 55.1121 23.5856 54.6996 23.7629C54.2956 23.9402 53.9464 24.1851 53.6518 24.4974C53.3572 24.8013 53.13 25.1644 52.97 25.5864C52.8101 26.0086 52.7302 26.4644 52.7302 26.9541C52.7302 27.4606 52.8059 27.9249 52.9574 28.347C53.1173 28.7692 53.3404 29.1321 53.6265 29.4361C53.9127 29.74 54.262 29.9764 54.6744 30.1452C55.0868 30.3056 55.5498 30.3858 56.0631 30.3858C56.8038 30.3858 57.4351 30.217 57.9569 29.8793C58.4787 29.5416 58.8659 28.9802 59.1184 28.1951H57.5402C57.4814 28.3977 57.3214 28.5919 57.0605 28.7776C56.7996 28.9549 56.4882 29.0435 56.1263 29.0435C55.6213 29.0435 55.2341 28.9127 54.9648 28.651C54.6955 28.3893 54.5482 27.9671 54.523 27.3846Z" fill="white"/>' +
        '<path d="M65.1811 26.9288C65.1811 27.1989 65.1559 27.4606 65.1054 27.7139C65.0548 27.9671 64.9707 28.1951 64.8529 28.3977C64.735 28.5919 64.5751 28.748 64.3731 28.8663C64.1795 28.9844 63.9354 29.0435 63.6409 29.0435C63.3631 29.0435 63.1233 28.9844 62.9212 28.8663C62.7277 28.7396 62.5635 28.5792 62.4289 28.385C62.3027 28.1824 62.2101 27.9545 62.1511 27.7012C62.0922 27.4479 62.0627 27.1947 62.0627 26.9414C62.0627 26.6712 62.088 26.4138 62.1385 26.169C62.1974 25.9157 62.2858 25.692 62.4036 25.4978C62.5299 25.3036 62.694 25.1474 62.896 25.0293C63.098 24.9111 63.3463 24.852 63.6409 24.852C63.9354 24.852 64.1795 24.9111 64.3731 25.0293C64.5667 25.1474 64.7224 25.3036 64.8402 25.4978C64.9665 25.6835 65.0548 25.903 65.1054 26.1563C65.1559 26.4011 65.1811 26.6586 65.1811 26.9288ZM65.2063 29.3854V30.2212H66.9107V21.1797H65.118V24.4721H65.0927C64.8907 24.1513 64.613 23.9107 64.2595 23.7503C63.9144 23.5814 63.5483 23.497 63.1611 23.497C62.6814 23.497 62.2605 23.5941 61.8987 23.7883C61.5367 23.974 61.2337 24.2231 60.9896 24.5354C60.754 24.8477 60.573 25.2108 60.4468 25.6244C60.329 26.0296 60.27 26.4518 60.27 26.8908C60.27 27.3466 60.329 27.7856 60.4468 28.2078C60.573 28.6298 60.754 29.0055 60.9896 29.3347C61.2337 29.6555 61.5409 29.9131 61.9113 30.1073C62.2816 30.293 62.7108 30.3858 63.199 30.3858C63.6283 30.3858 64.0112 30.3099 64.3479 30.1579C64.693 29.9975 64.9707 29.74 65.1811 29.3854H65.2063Z" fill="white"/>' +
        '<path d="M71.5606 28.6762C71.2828 28.6762 71.0513 28.6172 70.8668 28.499C70.6816 28.3808 70.5298 28.2288 70.4122 28.0431C70.3029 27.8574 70.2225 27.6505 70.1723 27.4226C70.1299 27.1862 70.1087 26.9498 70.1087 26.7135C70.1087 26.4686 70.1344 26.2365 70.1845 26.017C70.2437 25.789 70.3318 25.5907 70.4501 25.4218C70.5761 25.2445 70.7279 25.1053 70.9041 25.0039C71.0893 24.9027 71.3085 24.852 71.5606 24.852C71.8557 24.852 72.0994 24.9068 72.293 25.0166C72.4865 25.1264 72.6421 25.2741 72.7604 25.4598C72.8781 25.6455 72.9623 25.8608 73.0125 26.1056C73.0633 26.342 73.0884 26.5953 73.0884 26.8654C73.0884 27.1018 73.0549 27.3297 72.9874 27.5493C72.9282 27.7603 72.8357 27.9502 72.7096 28.1191C72.5836 28.2879 72.4235 28.423 72.2299 28.5243C72.0364 28.6256 71.8133 28.6762 71.5606 28.6762ZM74.793 29.8033V23.6743H73.0884V24.548H73.0633C72.8447 24.1681 72.5707 23.898 72.2428 23.7376C71.9226 23.5772 71.5484 23.497 71.1188 23.497C70.6642 23.497 70.2604 23.5856 69.9068 23.7629C69.5621 23.9402 69.2715 24.1808 69.0361 24.4848C68.8002 24.7802 68.6195 25.1264 68.4928 25.5231C68.3751 25.9115 68.316 26.3167 68.316 26.7388C68.316 27.1862 68.3668 27.6126 68.4677 28.0178C68.577 28.4145 68.7455 28.7649 68.9725 29.0689C69.2001 29.3643 69.4901 29.6007 69.8438 29.778C70.1974 29.9468 70.6179 30.0313 71.1066 30.0313C71.5021 30.0313 71.8763 29.9511 72.2299 29.7906C72.592 29.6218 72.8697 29.3643 73.0633 29.0182H73.0884V29.8793C73.0967 30.3436 72.9835 30.7278 72.7476 31.0316C72.5206 31.3356 72.1541 31.4875 71.6493 31.4875C71.3291 31.4875 71.0475 31.42 70.8031 31.2849C70.5594 31.1583 70.3955 30.9261 70.3112 30.5884H68.5307C68.5558 30.9599 68.6574 31.2765 68.8336 31.5382C69.0188 31.8083 69.2464 32.0278 69.5158 32.1967C69.7936 32.3655 70.0965 32.4879 70.4244 32.5639C70.7613 32.6483 71.0893 32.6905 71.4095 32.6905C72.1586 32.6905 72.7559 32.5892 73.2022 32.3866C73.6484 32.184 73.9892 31.9349 74.2245 31.6395C74.4605 31.3524 74.6116 31.0401 74.6791 30.7024C74.755 30.3647 74.793 30.065 74.793 29.8033Z" fill="white"/>' +
        '<path d="M80.8822 26.2449H77.9655C77.9745 26.1183 77.9996 25.9748 78.0414 25.8144C78.0922 25.654 78.172 25.502 78.2813 25.3585C78.3996 25.215 78.5507 25.0968 78.7359 25.0039C78.9294 24.9027 79.1692 24.852 79.4554 24.852C79.8933 24.852 80.2173 24.9702 80.4276 25.2065C80.6462 25.4429 80.798 25.789 80.8822 26.2449ZM77.9655 27.3846H82.6749C82.7083 26.8781 82.6666 26.3927 82.5489 25.9284C82.4306 25.4641 82.237 25.0503 81.9676 24.6874C81.7072 24.3243 81.3703 24.0373 80.9581 23.8263C80.5453 23.6067 80.0617 23.497 79.5062 23.497C79.0098 23.497 78.5552 23.5856 78.1424 23.7629C77.7386 23.9402 77.3894 24.1851 77.0949 24.4974C76.8004 24.8013 76.5728 25.1644 76.4127 25.5864C76.2532 26.0086 76.1729 26.4644 76.1729 26.9541C76.1729 27.4606 76.2487 27.9249 76.4005 28.347C76.5599 28.7692 76.7831 29.1321 77.0692 29.4361C77.3553 29.74 77.7051 29.9764 78.1173 30.1452C78.5295 30.3056 78.9924 30.3858 79.5062 30.3858C80.2469 30.3858 80.8777 30.217 81.3998 29.8793C81.9213 29.5416 82.309 28.9802 82.5611 28.1951H80.9832C80.924 28.3977 80.7645 28.5919 80.5035 28.7776C80.2424 28.9549 79.9312 29.0435 79.5692 29.0435C79.0644 29.0435 78.6767 28.9127 78.4079 28.651C78.1385 28.3893 77.9913 27.9671 77.9655 27.3846Z" fill="white"/>' +
        '<path d="M83.9905 23.6743V30.2212H85.7832V27.2706C85.7832 26.9752 85.8128 26.7008 85.8719 26.4475C85.9304 26.1943 86.0275 25.9748 86.1619 25.789C86.3053 25.5949 86.4905 25.4429 86.7175 25.3332C86.9451 25.2234 87.2229 25.1685 87.5508 25.1685C87.6601 25.1685 87.7739 25.177 87.8916 25.1939C88.0099 25.2024 88.1108 25.215 88.1944 25.2319V23.5603C88.0517 23.5181 87.9212 23.497 87.8035 23.497C87.5759 23.497 87.3572 23.5308 87.147 23.5983C86.9367 23.6658 86.7387 23.7629 86.5535 23.8895C86.3683 24.0078 86.2043 24.1555 86.061 24.3328C85.9182 24.5016 85.8044 24.6874 85.7202 24.89H85.6951V23.6743H83.9905Z" fill="white"/>' +
        '<path d="M37.7829 1.28601V33.4362" stroke="white" stroke-width="0.643004"/>' +
        '<path d="M22.1901 11.7348H10.9375V22.9874H22.1901V11.7348Z" fill="white"/>' +
        '<path fill-rule="evenodd" clip-rule="evenodd" d="M3.7037 4.50104H29.4239V30.2212H3.7037V4.50104ZM6.11497 6.9123H27.0126V27.8099H6.11497V6.9123Z" fill="white"/>' +
        '</svg>';
      
      // Add watermark to the chart container
      chartRef.current.style.position = 'relative';
      chartRef.current.appendChild(watermark);
      
      // Wait a moment for any animations to complete
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const canvas = await html2canvas(chartRef.current, {
        backgroundColor: 'transparent',
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        removeContainer: false,
        logging: false, // Disable logging
        imageTimeout: 15000,
        onclone: (clonedDoc) => {
          // STEP 1: Aggressively remove ALL modern color functions first
          const allElements = clonedDoc.querySelectorAll('*');
          allElements.forEach((element) => {
            const htmlElement = element as HTMLElement;
            
            // Remove all inline styles that contain modern color functions
            if (htmlElement.style) {
              const styleText = htmlElement.getAttribute('style') || '';
              if (styleText.includes('oklch') || styleText.includes('oklab') || 
                  styleText.includes('color(') || styleText.includes('lch(') || 
                  styleText.includes('lab(')) {
                // Completely remove the style attribute to be safe
                htmlElement.removeAttribute('style');
              }
            }
            
            // Remove CSS custom properties that might contain modern color functions
            if (htmlElement.style) {
              for (let i = htmlElement.style.length - 1; i >= 0; i--) {
                const property = htmlElement.style[i];
                const value = htmlElement.style.getPropertyValue(property);
                if (value && (value.includes('oklch') || value.includes('oklab') || 
                            value.includes('color(') || value.includes('lch(') || 
                            value.includes('lab('))) {
                  htmlElement.style.removeProperty(property);
                }
              }
            }
          });
          
          // STEP 2: Apply clean styling with compatible colors
          const style = clonedDoc.createElement('style');
          style.textContent = `
            /* Reset everything to safe colors */
            * {
              color: inherit;
              background-color: inherit;
              border-color: inherit;
            }
            
            /* Core card styling */
            .bg-black\\/80 { background-color: rgba(0, 0, 0, 0.8) !important; }
            .bg-black\\/90 { background-color: rgba(0, 0, 0, 0.9) !important; }
            .backdrop-blur-sm { backdrop-filter: none !important; }
            .border-gray-900 { border-color: rgb(17, 24, 39) !important; }
            .bg-gray-900 { background-color: rgb(17, 24, 39) !important; }
            
            /* Text colors */
            .text-gray-300 { color: rgb(209, 213, 219) !important; }
            .text-gray-400 { color: rgb(156, 163, 175) !important; }
            .text-gray-500 { color: rgb(107, 114, 128) !important; }
            .text-white { color: rgb(255, 255, 255) !important; }
            
            /* Font sizes with proper vertical spacing */
            .text-\\[12px\\] { 
              font-size: 12px !important; 
              line-height: 20px !important; 
              padding: 2px 0 !important;
              display: block !important;
              margin-bottom: 1px !important;
            }
            .text-\\[11px\\] { 
              font-size: 11px !important; 
              line-height: 18px !important; 
              padding: 2px 0 !important;
              display: inline-block !important;
            }
            .text-\\[10px\\] { 
              font-size: 10px !important; 
              line-height: 16px !important; 
              padding: 2px 0 !important;
              display: block !important;
              margin-top: 0px !important;
            }
            
            /* Legend styling */
            .w-2 { width: 0.5rem !important; min-width: 0.5rem !important; }
            .h-2 { height: 0.5rem !important; min-height: 0.5rem !important; }
            .w-1\\.5 { width: 0.375rem !important; min-width: 0.375rem !important; }
            .h-1\\.5 { height: 0.375rem !important; min-height: 0.375rem !important; }
            .mr-2 { margin-right: 0.5rem !important; }
            .mt-0\\.5 { margin-top: 0.125rem !important; }
            .rounded-sm { border-radius: 0.125rem !important; }
            .rounded-full { border-radius: 9999px !important; }
            .leading-relaxed { line-height: 18px !important; }
            .flex-shrink-0 { flex-shrink: 0 !important; }
            .items-center { align-items: center !important; }
            .truncate { 
              overflow: visible !important; 
              text-overflow: clip !important; 
              white-space: nowrap !important; 
            }
            
            /* Force perfect center alignment */
            .flex.items-center { 
              display: flex !important;
              align-items: center !important;
              justify-content: flex-start !important;
              min-height: 16px !important;
              padding: 3px !important;
              margin: 1px 0 !important;
            }
            
            /* Color indicator center alignment */
            .flex.items-center .w-1\\.5.h-1\\.5 {
              width: 6px !important;
              height: 6px !important;
              margin-right: 8px !important;
              margin-top: 0 !important;
              margin-bottom: 0 !important;
              flex-shrink: 0 !important;
              display: flex !important;
              align-self: center !important;
            }
            
            /* Text center alignment */
            .flex.items-center span {
              line-height: 16px !important;
              padding: 0 !important;
              margin: 0 !important;
              display: flex !important;
              align-items: center !important;
              font-size: 11px !important;
              height: 16px !important;
            }
            
            /* Hide legend items beyond first 10 in screenshots */
            .flex.items-center:nth-child(n+11) {
              display: none !important;
            }
            
            /* Ensure title and description are on separate lines */
            h2 {
              display: block !important;
              margin-bottom: 4px !important;
              clear: both !important;
            }
            
            p {
              display: block !important;
              margin-top: 2px !important;
              clear: both !important;
            }
            
            /* Force legend color indicators to be visible with fallback colors */
            /* Target legend items within flex containers */
            .flex.items-start .w-2.h-2:nth-of-type(1) { background-color: #00BFFF !important; } /* Sky Depth */
            .flex.items-start:nth-child(1) .w-2.h-2 { background-color: #00BFFF !important; } /* Sky Depth */
            .flex.items-start:nth-child(2) .w-2.h-2 { background-color: #1E90FF !important; } /* Dazzling Blue */
            .flex.items-start:nth-child(3) .w-2.h-2 { background-color: #40E0D0 !important; } /* Tropical Turquoise */
            .flex.items-start:nth-child(4) .w-2.h-2 { background-color: #4169E1 !important; } /* Royal Azure */
            .flex.items-start:nth-child(5) .w-2.h-2 { background-color: #32CD32 !important; } /* Vivid Green */
            .flex.items-start:nth-child(6) .w-2.h-2 { background-color: #7FFF00 !important; } /* Electric Chartreuse */
            .flex.items-start:nth-child(7) .w-2.h-2 { background-color: #ADFF2F !important; } /* Lime Zest */
            .flex.items-start:nth-child(8) .w-2.h-2 { background-color: #FFD700 !important; } /* Golden Yellow */
            .flex.items-start:nth-child(9) .w-2.h-2 { background-color: #FF9F68 !important; } /* Sunset Peach */
            .flex.items-start:nth-child(10) .w-2.h-2 { background-color: #FF6B6B !important; } /* Warm Coral */
            .flex.items-start:nth-child(11) .w-2.h-2 { background-color: #FF1493 !important; } /* Punchy Pink */
            .flex.items-start:nth-child(12) .w-2.h-2 { background-color: #FF69B4 !important; } /* Bubblegum */
            .flex.items-start:nth-child(13) .w-2.h-2 { background-color: #FF00FF !important; } /* Neon Magenta */
            .flex.items-start:nth-child(14) .w-2.h-2 { background-color: #BA55D3 !important; } /* Orchid Bloom */
            .flex.items-start:nth-child(15) .w-2.h-2 { background-color: #9370DB !important; } /* Lavender Mist */
            .flex.items-start:nth-child(16) .w-2.h-2 { background-color: #6A5ACD !important; } /* Deep Periwinkle */
            .flex.items-start:nth-child(17) .w-2.h-2 { background-color: #DA70D6 !important; } /* Dusty Orchid */
            .flex.items-start:nth-child(18) .w-2.h-2 { background-color: #AFEEEE !important; } /* Soft Cyan */
            .flex.items-start:nth-child(19) .w-2.h-2 { background-color: #87CEEB !important; } /* Airy Blue */
            .flex.items-start:nth-child(20) .w-2.h-2 { background-color: #98FB98 !important; } /* Pastel Mint */
            
            /* Button colors */
            .bg-blue-500\\/10 { background-color: rgba(59, 130, 246, 0.1) !important; }
            .bg-blue-500\\/20 { background-color: rgba(59, 130, 246, 0.2) !important; }
            .text-blue-400 { color: rgb(96, 165, 250) !important; }
            
            /* Chart elements */
            svg text { fill: rgb(209, 213, 219) !important; }
            svg path { stroke: currentColor !important; }
            svg rect { fill: currentColor !important; }
          `;
          clonedDoc.head.appendChild(style);
        },
        ignoreElements: (element) => {
          // Only ignore action buttons and edit controls
          return element.classList.contains('screenshot-ignore');
        }
      });
      
      // Create a final canvas with dark background
      const finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      finalCanvas.width = canvas.width;
      finalCanvas.height = canvas.height;
      
      // Fill with dark background
      if (ctx) {
        ctx.fillStyle = '#000000';
        ctx.fillRect(0, 0, finalCanvas.width, finalCanvas.height);
        ctx.drawImage(canvas, 0, 0);
      }
      
      // Create download link
      const link = document.createElement('a');
      const fileName = `${title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.png`;
      link.download = fileName;
      link.href = finalCanvas.toDataURL('image/png', 1.0);
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log('Screenshot captured successfully:', fileName);
      
      // Remove watermark from DOM
      if (watermark && chartRef.current?.contains(watermark)) {
        chartRef.current.removeChild(watermark);
      }
      
    } catch (error) {
      console.error('Screenshot failed:', error);
      
      // Remove watermark from DOM in case of error
      if (watermark && chartRef.current?.contains(watermark)) {
        chartRef.current.removeChild(watermark);
      }
      
      // Show user-friendly error
      alert('Screenshot failed. Please try again or contact support if the issue persists.');
    } finally {
      setIsCapturing(false);
    }
  };

  // Chart summarization function
  const handleSummarize = async () => {
    if (!chart?.id || !chart?.page) {
      setError('Chart ID or page information not available for summarization');
      setShowSummary(true);
      return;
    }

    // Show modal immediately and start thinking state
    setIsSummarizing(true);
    setShowSummary(true);
    setSummary(null); // Clear any previous summary
    setError(null); // Clear any previous error
    
    try {
      const response = await fetch('/api/chart-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          chartId: chart.id,
          pageId: chart.page
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setSummary(data.summary);
      setError(null); // Clear error on success
      setRateLimitEndTime(null); // Clear any rate limit on success
      
      // Call the optional callback
      if (onSummarizeClick) {
        onSummarizeClick();
      }
      
    } catch (error) {
      console.error('Chart summarization failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate chart summary. Please try again.';
      
      // Check if it's a rate limit error
      if (errorMessage.toLowerCase().includes('rate limit') || errorMessage.toLowerCase().includes('too many requests')) {
        setRateLimitEndTime(Date.now() + (30 * 60 * 1000)); // 30 minutes from now
      } else {
        setRateLimitEndTime(null); // Clear any existing rate limit
      }
      
      setError(errorMessage);
      setSummary(null); // Clear summary on error
    } finally {
      setIsSummarizing(false);
    }
  };

  // Define color variants
  const colorVariants = {
    blue: {
      hover: 'hover:shadow-blue-900/20',
      button: 'bg-blue-500/10 text-blue-400 hover:bg-blue-500/20',
      border: 'border-blue-400',
    },
    purple: {
      hover: 'hover:shadow-purple-900/20',
      button: 'bg-purple-500/10 text-purple-400 hover:bg-purple-500/20',
      border: 'border-purple-400',
    },
    green: {
      hover: 'hover:shadow-green-900/20',
      button: 'bg-green-500/10 text-green-400 hover:bg-green-500/20',
      border: 'border-green-400',
    },
    orange: {
      hover: 'hover:shadow-orange-900/20',
      button: 'bg-orange-500/10 text-orange-400 hover:bg-orange-500/20',
      border: 'border-orange-400',
    },
    indigo: {
      hover: 'hover:shadow-indigo-900/20',
      button: 'bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20',
      border: 'border-indigo-400',
    },
  };

  // Map legendWidth to tailwind classes
  const legendWidthClasses = {
    '1/4': 'lg:w-1/4',
    '1/5': 'lg:w-1/5',
    '1/6': 'lg:w-1/6',
  };

  const colors = colorVariants[accentColor];

  return (
    <div 
      ref={chartRef}
      id={id} 
      className={`bg-black/80 backdrop-blur-sm p-4 rounded-xl border border-gray-900 shadow-lg transition-all duration-300 relative ${
        isEditMode ? 'cursor-grab active:cursor-grabbing border-blue-500/30 bg-black/90' : colors.hover
      } ${className}`}
      {...(isEditMode ? dragHandleProps : {})}
    >
      {/* Edit Mode Controls */}
      {isEditMode && (
        <>
          {/* Delete Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDeleteClick?.();
            }}
            className="absolute -top-2 -right-2 z-10 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors group cursor-pointer screenshot-ignore"
            title="Delete Chart"
          >
            <XMarkIcon className="w-3.5 h-3.5" />
          </button>
        </>
      )}

      {/* Header Section with Title and Action Buttons */}
      <div className="flex justify-between items-center mb-3">
        <div className="-mt-1">
          <h2 className="text-[12px] font-normal text-gray-300 leading-tight mb-0.5">{title}</h2>
          {description && <p className="text-gray-500 text-[10px] tracking-wide">{description}</p>}
        </div>
        {!isEditMode && (
          <div className="flex justify-end space-x-2 -mr-2 md:mr-0 screenshot-ignore" onClick={(e) => e.stopPropagation()}>
            {chart?.id && chart?.page && (
              <button 
                className={`p-1.5 ${colors.button} rounded-md transition-colors ${isSummarizing ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={handleSummarize}
                title="Summarize Chart Data with AI"
                disabled={isSummarizing} hidden={false}
              >
                {isSummarizing ? (
                  <Loader size="xs" className="w-4 h-4" />
                ) : (
                  <SparklesIcon className="w-4 h-4" />
                )}
              </button>
            )}
            <button 
              className={`p-1.5 ${colors.button} rounded-md transition-colors ${isCapturing ? 'opacity-50 cursor-not-allowed' : ''}`}
              onClick={handleScreenshot}
              title="Take Screenshot"
              disabled={isCapturing}
            >
              {(isCapturing) ? (
                <Loader size="xs" className="w-4 h-4" />
              ) : (
                <CameraIcon className="w-4 h-4" />
              )}
            </button>
            {chart && (
              <ShareButton 
                chart={chart} 
                filterValues={filterValues} 
                className={colors.button}
              />
            )}
            {onDownloadClick && (
              <button 
                className={`p-1.5 ${colors.button} rounded-md transition-colors ${isDownloading ? 'opacity-50 cursor-not-allowed' : ''}`}
                onClick={onDownloadClick}
                title="Download CSV"
                disabled={isDownloading}
              >
                {isDownloading ? (
                  <Loader size="sm" />
                ) : (
                  <DownloadIcon className="w-4 h-4" />
                )}
              </button>
            )}
            {onExpandClick && (
              <button 
                className={`p-1.5 ${colors.button} rounded-md transition-colors hidden md:block`}
                onClick={onExpandClick}
                title="Expand Chart"
              >
                <ExpandIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* First Divider */}
      <div className="h-px bg-gray-900 w-full"></div>
      
      {/* Filter Bar */}
      {filterBar && (
        <>
          <div 
            className="flex items-center justify-start pl-1 py-2 overflow-visible relative screenshot-ignore"
            onClick={(e) => e.stopPropagation()}
          >
            {filterBar}
          </div>
          {/* Second Divider after filters */}
          <div className="h-px bg-gray-900 w-full screenshot-ignore"></div>
        </>
      )}
      
      {/* Content Area - Split into columns on desktop, stacked on mobile */}
      <div className="flex flex-col lg:flex-row mt-3 h-[290px] md:h-[380px] lg:h-[380px]">
        {/* Chart Area */}
        <div 
          data-chart-id={id}
          className={`flex-grow ${legend ? 'lg:pr-4 lg:border-r lg:border-gray-900' : ''} h-64 lg:h-auto relative`} 
          style={{ contain: 'layout style' }}
        >
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10 rounded-md">
              
            </div>
          )}
          {children}
        </div>
       
        {/* Legend Area - Only render if legend is provided */}
        {legend && (
          <div 
            className={`${legendWidthClasses[legendWidth]} mt-2 lg:mt-0 lg:pl-4 flex flex-col`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="h-px bg-gray-900 w-full lg:hidden md:hidden mb-2"></div>
            <div className="flex-1 min-h-0">
              <div className="h-full overflow-y-auto
                [&::-webkit-scrollbar]:w-1.5 
                [&::-webkit-scrollbar-track]:bg-transparent 
                [&::-webkit-scrollbar-thumb]:bg-gray-700/40
                [&::-webkit-scrollbar-thumb]:rounded-full
                [&::-webkit-scrollbar-thumb]:hover:bg-gray-600/60
                scrollbar-thin scrollbar-track-transparent scrollbar-thumb-gray-700/40">
                <div className="flex flex-row lg:flex-col gap-2 lg:gap-2 pt-1 pb-0">
                  {legend}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Summary Modal - Rendered as Portal */}
      {showSummary && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[9999]" onClick={() => {
          setShowSummary(false);
          setSummary(null);
          setError(null);
          setRateLimitEndTime(null);
        }}>
          <div className="bg-gray-950/90 rounded-xl border border-gray-800 max-w-3xl w-full max-h-[85vh] overflow-hidden shadow-2xl animate-in fade-in duration-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950/90">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-regular text-gray-400">
                  {error ? 'Error' : isSummarizing ? 'Thinking...' : 'Chart Summary'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowSummary(false);
                  setSummary(null);
                  setError(null);
                  setRateLimitEndTime(null);
                }}
                className="text-gray-400 hover:text-white transition-colors p-1 rounded-md hover:bg-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(85vh-140px)]">
              <div className="text-sm text-gray-300 mb-4 pb-3 border-b border-gray-800">
                <span className="text-gray-500 font-normal">Chart:</span> 
                <span className="ml-2 text-gray-300">{title}</span>
              </div>
              
              {error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="text-gray-400 text-center max-w-md mb-6">
                    {error}
                  </div>
                  <button
                    onClick={handleSummarize}
                    className={`px-4 py-2 rounded-lg transition-colors ${
                      remainingMinutes > 0 
                        ? 'text-gray-500 cursor-not-allowed' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                    disabled={isSummarizing || remainingMinutes > 0}
                  >
                    {isSummarizing 
                      ? 'Retrying...' 
                      : remainingMinutes > 0 
                        ? `Try Again in ${remainingMinutes} minute${remainingMinutes !== 1 ? 's' : ''}`
                        : 'Try Again'
                    }
                  </button>
                </div>
              ) : isSummarizing && !summary ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="flex items-center gap-2 mb-2">
                    <SparklesIcon className="w-8 h-8 text-blue-400 animate-pulse" />
                    <div className="text-sm font-regular text-gray-400">Thinking...</div>
                  </div>
                 
                  <div className="flex gap-1 mt-6">
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-1 h-1 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                </div>
              ) : summary ? (
                <div className="prose prose-invert prose-blue max-w-none text-gray-200 leading-relaxed">
                  <ReactMarkdown
                    components={{
                      h1: ({ children }) => <h1 className="text-lg font-bold text-gray-300 mb-3 mt-4 first:mt-0">{children}</h1>,
                      h2: ({ children }) => <h2 className="text-md font-medium text-gray-300 mb-2 mt-4 first:mt-0">{children}</h2>,
                      h3: ({ children }) => <h3 className="text-base font-normal text-gray-300 mb-2 mt-3 first:mt-0">{children}</h3>,
                      p: ({ children }) => <p className="text-gray-300 mb-3 leading-relaxed">{children}</p>,
                      strong: ({ children }) => <strong className="text-white font-semibold">{children}</strong>,
                      ul: ({ children }) => <ul className="text-gray-300 mb-3 ml-4 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="text-gray-300 mb-3 ml-4 space-y-1">{children}</ol>,
                      li: ({ children }) => {
                        // Convert children to string to check for trend indicators
                        const childrenString = React.Children.toArray(children).join('');
                        const TrendIcon = getTrendIcon(childrenString);
                        const cleanedText = cleanTrendText(childrenString);
                        const iconColor = getTrendColor(childrenString);
                        
                        return (
                          <li className="text-gray-300 leading-relaxed">
                            {cleanedText}
                            {TrendIcon && (
                              <TrendIcon className={`w-3 h-3 ${iconColor} ml-2 inline-block opacity-80`} />
                            )}
                          </li>
                        );
                      },
                      code: ({ children }) => <code className="bg-gray-800 text-blue-300 px-1.5 py-0.5 rounded text-sm">{children}</code>,
                      blockquote: ({ children }) => <blockquote className="border-l-4 border-blue-500 pl-4 italic text-gray-300 my-3">{children}</blockquote>,
                    }}
                  >
                    {summary}
                  </ReactMarkdown>
                </div>
              ) : null}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default ChartCard; 