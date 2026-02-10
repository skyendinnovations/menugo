import React from 'react';
import { View, Text, Pressable, ViewProps } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

interface PaginationProps extends ViewProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  ...props
}: PaginationProps) {
  const pages = [];
  const maxPagesToShow = 5;

  let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
  let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

  if (endPage - startPage < maxPagesToShow - 1) {
    startPage = Math.max(1, endPage - maxPagesToShow + 1);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return (
    <View
      className={`flex-row items-center justify-center gap-2 py-4 ${className || ''}`}
      {...props}
    >
      <Pressable
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className={`p-2 ${currentPage === 1 ? 'opacity-30' : ''}`}
      >
        <MaterialIcons name="chevron-left" size={24} color="#F97316" />
      </Pressable>

      {startPage > 1 && (
        <>
          <PaginationButton page={1} currentPage={currentPage} onPageChange={onPageChange} />
          {startPage > 2 && <Text className="text-slate-500 px-2">...</Text>}
        </>
      )}

      {pages.map((page) => (
        <PaginationButton
          key={page}
          page={page}
          currentPage={currentPage}
          onPageChange={onPageChange}
        />
      ))}

      {endPage < totalPages && (
        <>
          {endPage < totalPages - 1 && <Text className="text-slate-500 px-2">...</Text>}
          <PaginationButton
            page={totalPages}
            currentPage={currentPage}
            onPageChange={onPageChange}
          />
        </>
      )}

      <Pressable
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className={`p-2 ${currentPage === totalPages ? 'opacity-30' : ''}`}
      >
        <MaterialIcons name="chevron-right" size={24} color="#F97316" />
      </Pressable>
    </View>
  );
}

function PaginationButton({
  page,
  currentPage,
  onPageChange,
}: {
  page: number;
  currentPage: number;
  onPageChange: (page: number) => void;
}) {
  const isActive = page === currentPage;

  return (
    <Pressable
      onPress={() => onPageChange(page)}
      className={`w-10 h-10 rounded-xl items-center justify-center ${
        isActive ? 'bg-brand' : 'bg-slate-800'
      }`}
    >
      <Text className={`font-semibold ${isActive ? 'text-white' : 'text-slate-400'}`}>
        {page}
      </Text>
    </Pressable>
  );
}
