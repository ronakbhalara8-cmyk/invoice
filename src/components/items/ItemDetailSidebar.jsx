"use client";

import {useState, useEffect, useRef} from "react";
import {X, Maximize2, Edit, Calendar, Tag, Package, DollarSign, Clock, AlertCircle} from "lucide-react";

export default function ItemDetailSidebar({isOpen, onClose, item, onEdit}) {
  const [isImageZoomed, setIsImageZoomed] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const sidebarRef = useRef(null);

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  };

  // Close sidebar on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        handleClose();
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!item) return null;

  // Safe function to get ID display
  const getDisplayId = (id) => {
    if (!id) return 'N/A';
    const idStr = String(id);
    return idStr.length > 8 ? idStr.slice(0, 8) : idStr;
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'N/A';
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'N/A';
    }
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      'Active': {
        color: 'text-emerald-700',
        icon: '●',
        dotColor: 'bg-emerald-500'
      },
      'Inactive': {
        color: 'text-red-700',
        icon: '●',
        dotColor: 'bg-red-500'
      },
      'Pending': {
        color: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: '●',
        dotColor: 'bg-amber-500'
      }
    };
    const statusInfo = statusMap[status] || statusMap['Inactive'];
    return (
      <span className={`inline-flex items-center gap-2 text-sm font-medium ${statusInfo.color}`}>
        <span className={`w-2 h-2 rounded-full ${statusInfo.dotColor}`}></span>
        {status || 'Inactive'}
      </span>
    );
  };

  const handleEdit = () => {
    if (onEdit && item) {
      handleClose();
      setTimeout(() => {
        onEdit(item);
      }, 300);
    }
  };

  return (
    <>
      {/* Backdrop with fade animation */}
      <div
        className={`fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 z-40 ${isOpen && !isClosing ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        onClick={handleClose}
      />

      {/* Sidebar with slide animation */}
      <div
        ref={sidebarRef}
        className={`fixed top-0 font-sans right-0 h-full w-full max-w-md bg-white shadow-2xl z-50 transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] ${isOpen && !isClosing ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
          }`}
      >
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5 flex items-center justify-between z-10">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-white truncate">Item Details</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleClose}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-all duration-200 text-white"
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content - No scroll needed as everything fits */}
        <div className="p-6 space-y-5 overflow-y-auto h-full">
          {/* Image Section */}
          <div className="flex items-center gap-x-5">
            <div className="relative w-30 h-30">
              <div
                className="relative rounded-2xl overflow-hidden bg-gray-50 border-2 border-gray-100 cursor-pointer group"
                onClick={() => setIsImageZoomed(true)}
              >
                {item.image && !imageError ? (
                  <>
                    <img
                      src={item.image}
                      alt={item.name || 'Item image'}
                      className="w-30 h-30 object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={() => setImageError(true)}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
                      <div className="bg-black/50 backdrop-blur-sm rounded-full p-3 transform group-hover:scale-110 transition-transform duration-300">
                        <Maximize2 className="w-5 h-5 text-white" />
                      </div>
                    </div>
                    <div className="absolute bottom-3 right-3 bg-black/50 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full">
                      Click to zoom
                    </div>
                  </>
                ) : (
                  <div className="w-30 h-30 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3">
                        <Package className="w-10 h-10 text-gray-500" />
                      </div>
                      <p className="text-sm text-gray-500 font-medium">No Image Available</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Status Badge */}

            <div className="space-y-1.5">
              {getStatusBadge(item.status)}
            {/* Item Name & Price */}
              <h3 className="text-2xl font-bold text-gray-900">{item.name || 'Unnamed Item'}</h3>
              <div className="inline-flex items-center gap-2">
                <span className="text-2xl font-bold text-blue-600">
                  ₹{item.price ? parseFloat(item.price).toFixed(2) : '0.00'}
                </span>
              </div>
            </div>
          </div>

          {/* Description */}
          <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-1">Description</p>
                <p className="text-gray-700 leading-relaxed text-sm">
                  {item.description || 'No description provided'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Zoom Modal with smooth animation */}
      {isImageZoomed && item.image && !imageError && (
        <div
          className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setIsImageZoomed(false)}
        >
          <button
            onClick={() => setIsImageZoomed(false)}
            className="absolute top-6 right-6 text-white hover:text-gray-300 transition-colors z-10 bg-black/50 backdrop-blur-sm rounded-full p-3 hover:bg-black/70"
          >
            <X className="w-6 h-6" />
          </button>

          <div
            className="relative max-w-5xl max-h-[90vh] animate-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={item.image}
              alt={item.name || 'Item image'}
              className="max-w-full max-h-[90vh] object-contain rounded-2xl shadow-2xl"
              onError={() => setImageError(true)}
            />

            {/* Image info overlay */}
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6 rounded-b-2xl">
              <div className="flex items-center justify-between text-white">
                <div>
                  <p className="text-sm font-medium">{item.name || 'Item'}</p>
                  <p className="text-xs opacity-80">Click anywhere to close</p>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-full px-3 py-1 text-xs">
                  {item.price ? `₹${parseFloat(item.price).toFixed(2)}` : 'Price N/A'}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}