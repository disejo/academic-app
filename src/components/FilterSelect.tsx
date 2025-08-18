"use client";
import React, { useState, useEffect } from 'react';
import Select, { SingleValue, MultiValue, StylesConfig } from 'react-select';

// Definimos un tipo genérico para las opciones.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Option = { [key: string]: any };

// Props que el componente aceptará
interface FilterSelectProps {
  options: Option[];
  onSelect: (selected: Option | null | readonly Option[]) => void; // Aceptamos readonly para compatibilidad con react-select
  optionLabelKey: string;
  optionValueKey: string;
  placeholder?: string;
  isMulti?: boolean;
  initialValue?: Option | Option[];
}

const FilterSelect: React.FC<FilterSelectProps> = ({
  options,
  onSelect,
  optionLabelKey,
  optionValueKey,
  placeholder = "Selecciona...",
  isMulti = false,
  initialValue,
}) => {
  const [inputValue, setInputValue] = useState("");
  const [isDark, setIsDark] = useState(false);

  // Efecto para detectar el tema oscuro y observar cambios
  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
    };
    checkTheme();
    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const selectOptions = options.map(option => ({
    ...option,
    label: option[optionLabelKey],
    value: option[optionValueKey],
  }));

  const getInitialValue = () => {
    if (!initialValue) return isMulti ? [] : null;
    const findOption = (val: Option) => selectOptions.find(so => so.value === val[optionValueKey]);
    if (isMulti && Array.isArray(initialValue)) {
      return initialValue.map(findOption).filter(Boolean);
    }
    if (!isMulti && !Array.isArray(initialValue)) {
      return findOption(initialValue) || null;
    }
    return isMulti ? [] : null;
  };

  // Removed misplaced import statement for ActionMeta.

  const handleChange = (
    selected: SingleValue<Option | undefined> | MultiValue<Option | undefined>
  ) => {
    // Remove undefined values for MultiValue, or pass null for SingleValue undefined
    if (Array.isArray(selected)) {
      const filtered = selected.filter((opt): opt is Option => !!opt);
      onSelect(filtered);
    } else {
      onSelect(selected ?? null);
    }
    setInputValue("");
  };

  const handleInputChange = (value: string) => {
    setInputValue(value);
  };

  // Paleta de colores para modo claro y oscuro
  const colors = {
    dark: {
      controlBg: '#ffffff',
      controlBorder: '#e2e8f0',
      controlBorderHover: '#cbd5e0',
      controlBorderFocused: '#3b82f6',
      menuBg: '#ffffff',
      optionBgFocused: '#eff6ff',
      optionBgSelected: '#3b82f6',
      text: '#1f2937',
      textSelected: '#ffffff',
      placeholder: '#6b7280',
    },
    light: {
      controlBg: '#1f2937', // bg-gray-800
      controlBorder: '#4b5563', // border-gray-600
      controlBorderHover: '#6b7280', // border-gray-500
      controlBorderFocused: '#3b82f6',
      menuBg: '#111827', // bg-gray-900
      optionBgFocused: '#374151', // bg-gray-700
      optionBgSelected: '#3b82f6',
      text: '#f3f4f6', // text-gray-100
      textSelected: '#ffffff',
      placeholder: '#9ca3af', // text-gray-400
    }
  };

  const themeColors = isDark ? colors.dark : colors.light;

  const colourStyles: StylesConfig<Option | undefined, boolean> = {
    control: (styles, { isFocused }) => ({ 
      ...styles, 
      backgroundColor: themeColors.controlBg,
      borderColor: isFocused ? themeColors.controlBorderFocused : themeColors.controlBorder,
      boxShadow: isFocused ? `0 0 0 1px ${themeColors.controlBorderFocused}` : 'none',
      borderRadius: '0.375rem',
      minHeight: '42px',
      "&:hover": {
        borderColor: isFocused ? themeColors.controlBorderFocused : themeColors.controlBorderHover,
      },
    }),
    input: (styles) => ({ ...styles, color: themeColors.text }),
    placeholder: (styles) => ({ ...styles, color: themeColors.placeholder }),
    singleValue: (styles) => ({ ...styles, color: themeColors.text }),
    menu: (styles) => ({ 
        ...styles, 
        backgroundColor: themeColors.menuBg,
        borderRadius: '0.375rem',
        marginTop: '4px',
    }),
    option: (styles, { isFocused, isSelected }) => ({
      ...styles,
      backgroundColor: isSelected ? themeColors.optionBgSelected : isFocused ? themeColors.optionBgFocused : undefined,
      color: isSelected ? themeColors.textSelected : themeColors.text,
      cursor: 'pointer',
      "&:active": {
        backgroundColor: themeColors.optionBgSelected,
      },
    }),
    menuList: (styles) => ({ ...styles, padding: '4px' }),
    noOptionsMessage: (styles) => ({ ...styles, color: themeColors.placeholder }),
  };

  return (
    <Select
      options={inputValue ? selectOptions : []}
      onChange={handleChange}
      onInputChange={handleInputChange}
      inputValue={inputValue}
      value={getInitialValue()}
      isMulti={isMulti}
      placeholder={placeholder}
      isSearchable={true}
      styles={colourStyles}
      classNamePrefix="react-select"
      noOptionsMessage={() => inputValue ? 'No se encontraron resultados' : 'Escribe para buscar...'}
    />
  );
};

export default FilterSelect;